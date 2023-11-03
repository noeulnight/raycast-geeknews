import { ActionPanel, List, Action, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { NodeHtmlMarkdown } from 'node-html-markdown'
import { useEffect, useState } from "react";
import fetch from 'node-fetch'
import Parser from 'rss-parser'
import moment from 'moment'
import * as cheerio from 'cheerio'

interface RssFeed {
  title: string
  link: string
  id: string
  content: string
  pubDate: string
}

export default function Command() {
  const { rssUrl } = getPreferenceValues()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [rssFeed, setRssFeed] = useState<RssFeed[]>()

  const fetchRss = async () => {
    try {
      const parser = new Parser()
      const feed = await parser.parseURL(rssUrl)
        
      const items = feed.items as RssFeed[]
      const itemsWithContent = await Promise.all(items.map(async (item) => {
        const content = await getItemDetail(item.link)
        return {
          ...item,
          content
        }
      }))

      console.log(itemsWithContent)
      setRssFeed(itemsWithContent)
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch RSS feed",
      })
    }
  }

  const getItemDetail = async (link: string): Promise<string> => {
    const response = await fetch(link).then((res) => res.text())
    const $ = cheerio.load(response)
    const content = $('.topic_contents').html() ?? ''

    const markdown = NodeHtmlMarkdown.translate(content)

    return markdown === '' ? 'No content' : markdown
  }

  useEffect(() => {
    fetchRss()
  }, [rssUrl])

  return (
    <List isLoading={isLoading} isShowingDetail={true}>
      {rssFeed && rssFeed?.map((item: RssFeed) => (
        <List.Item
          key={item.link}
          title={item.title ?? ''}
          subtitle={moment(item.pubDate).fromNow()}
          detail={
            <List.Item.Detail
              markdown={`# ${item.title}\n${item.content}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Browser" url={item.link ?? ''} />
              <Action.CopyToClipboard title="Copy URL" content={item.link ?? ''} />
            </ActionPanel>
          } 
        />
      ))}
    </List>
  );
}
