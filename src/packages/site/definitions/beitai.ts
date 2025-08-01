import type { ISiteMetadata } from "../types";

export const siteMetadata: ISiteMetadata = {
  version: 1,
  id: "beitai",
  name: "备胎",
  description: "找不到家时，接纳无家可归的人",

  collaborator: ["wyx1818", "tongyifan"],

  type: "private",
  schema: "NexusPHP",

  favicon: "./_default_nexusphp.png",
  urls: ["https://www.beitai.pt/"],

  isDead: true,

  levelRequirements: [
    {
      id: 0,
      name: "User",
      privilege: "",
    },
    {
      id: 1,
      name: "Power User",
      interval: "P4W",
      downloaded: "50GB",
      ratio: 1.05,
      privilege:
        "得到一个邀请名额；直接发布种子；查看NFO文档；查看用户列表；请求续种；发送邀请；查看排行榜；查看其它用户的种子历史；删除自己上传的字幕。",
    },
    {
      id: 2,
      name: "Elite User",
      interval: "P8W",
      downloaded: "120GB",
      ratio: 1.55,
      privilege: "封存账号后不会被删除",
    },
    {
      id: 3,
      name: "Crazy User",
      interval: "P15W",
      downloaded: "300GB",
      ratio: 2.05,
      privilege: "得到两个邀请名额；在做种/下载/发布的时候选择匿名模式",
    },
    {
      id: 4,
      name: "Insane User",
      interval: "P25W",
      downloaded: "500GB",
      ratio: 2.55,
      privilege: "发送邀请；查看普通日志",
    },
    {
      id: 5,
      name: "Veteran User",
      interval: "P40W",
      downloaded: "750GB",
      ratio: 3.05,
      privilege: "永远保留账号；得到三个邀请名额；查看其它用户的评论、帖子历史",
    },
    {
      id: 6,
      name: "Extreme User",
      interval: "P60W",
      downloaded: "1TB",
      ratio: 3.55,
      privilege: "更新过期的外部信息；查看Extreme User论坛",
    },
    {
      id: 7,
      name: "Ultimate User",
      interval: "P80W",
      downloaded: "1.5TB",
      ratio: 4.05,
      privilege: "得到五个邀请名额",
    },
    {
      id: 8,
      name: "Nexus Master",
      interval: "P100W",
      downloaded: "3TB",
      ratio: 4.55,
      privilege: "得到十个邀请名额",
    },
  ],
};
