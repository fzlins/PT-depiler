<script setup lang="ts">
import { ref } from "vue";
import * as estoolkit from "es-toolkit";
import * as datefns from "date-fns";
import axios from "axios";
import Sizzle from "sizzle";
import {
  definitionList,
  getDefinedSiteMetadata,
  getFavicon,
  getSite as createSiteInstance,
  type TSiteID,
} from "@ptd/site";

import { getDownloader } from "@ptd/downloader";
import { getMediaServer } from "@ptd/mediaServer";
import { getBackupServer } from "@ptd/backupServer";
import { useMetadataStore } from "@/options/stores/metadata.ts";
import { useConfigStore } from "@/options/stores/config.ts";
import { sendMessage } from "@/messages.ts";

import { setupReplaceUnsafeHeader } from "~/extends/axios/replaceUnsafeHeader.ts";
import { setupRetryWhenCloudflareBlock } from "~/extends/axios/retryWhenCloudflareBlock.ts";

setupRetryWhenCloudflareBlock(setupReplaceUnsafeHeader(axios));

function enableLibrary() {
  (window as any).axios = axios;
  (window as any).Sizzle = Sizzle;
  (window as any)._ = estoolkit;
  (window as any).datefns = datefns;
  (window as any).sendMessage = sendMessage;
  console.log("开发库已启用");
}

const selectedSite = ref<TSiteID>("");
const useCustomerConfig = ref<boolean>(true);

const clearSiteTarget = ref<TSiteID>("all");
const siteSelectItems = [{ title: "全部", value: "all" }, ...definitionList.map((x) => ({ title: x, value: x }))];

const piniaStoreContent = import.meta.glob<Record<string, Function>>("@/options/stores/*.ts");
const piniaStoreName: Array<{ title: string; value: string }> = Object.keys(piniaStoreContent).map((x) => ({
  title: x.replace(/^.+\//, "").replace(/\.ts$/, ""),
  value: x,
}));
const selectedPiniaStore = ref();

const metadataStore = useMetadataStore();

const simpleServer = ref<Record<string, { selected: string; piniaKey: keyof typeof metadataStore; getFn: Function }>>({
  Downloader: { selected: "", piniaKey: "downloaders", getFn: getDownloader },
  MediaServer: { selected: "", piniaKey: "mediaServers", getFn: getMediaServer },
  BackupServer: { selected: "", piniaKey: "backupServers", getFn: getBackupServer },
});

async function getSiteMetadata() {
  return await getDefinedSiteMetadata(selectedSite.value);
}

async function getSiteConfig() {
  return await metadataStore.getSiteUserConfig(selectedSite.value, useCustomerConfig.value);
}

async function getSiteInstance() {
  let customerConfig = {};
  if (useCustomerConfig.value) {
    customerConfig = await getSiteConfig();
  }

  return await createSiteInstance(selectedSite.value, customerConfig);
}

async function getSiteFavicon() {
  const siteInstance = await getSiteInstance();
  return await getFavicon(siteInstance.metadata);
}

async function getPiniaStore(storeName: string) {
  const storeModule = await piniaStoreContent[storeName]();
  const storeFunction = Object.keys(storeModule).filter((f) => /use.+Store/.test(f));
  if (storeFunction.length > 0) {
    return storeModule[storeFunction[0]]();
  }
}

const log = async (v: any) => {
  console.log(await v);
};

interface resetItem {
  title: string;
  subTitle?: string;
  resetFn: () => Promise<void>;
}

const resetItems: resetItem[] = [
  {
    title: "重置系统设置",
    subTitle: "重置所有系统设置（包括但不限于语言、主题、表格展示、图片样式等常规设置）为默认值",
    resetFn: async () => {
      const configStore = useConfigStore();
      configStore.$reset();
      await configStore.$save();
    },
  },
  {
    title: "清空用户配置",
    subTitle: "清空所有用户配置（包括但不限于站点、下载器、搜索方案及默认值、搜索快照元数据、最近一次用户信息）",
    resetFn: async () => {
      const metadataStore = useMetadataStore();
      metadataStore.$reset();
      await metadataStore.$save();
    },
  },
  {
    title: "清空站点数据",
    subTitle: "清空用户获取的站点数据（包括用户信息历史记录和最近一次用户信息）",
    resetFn: async () => {
      const metadataStore = useMetadataStore();
      if (clearSiteTarget.value === "all") {
        // 清空所有站点数据
        metadataStore.lastUserInfo = {};
        await sendMessage("setExtStorage", { key: "userInfo", value: {} });
      } else {
        // 清空指定站点数据
        if (metadataStore.lastUserInfo[clearSiteTarget.value]) delete metadataStore.lastUserInfo[clearSiteTarget.value];
        const userInfo = (await sendMessage("getExtStorage", "userInfo")) as Record<string, any>;
        if (userInfo && userInfo[clearSiteTarget.value]) {
          delete userInfo[clearSiteTarget.value];
          await sendMessage("setExtStorage", { key: "userInfo", value: userInfo });
        }
      }
      await metadataStore.$save();
    },
  },
  {
    title: "清空历史下载记录",
    resetFn: async () => {
      await sendMessage("clearDownloadHistory", undefined);
    },
  },
  {
    title: "清空站点 Favicon 缓存",
    resetFn: async () => {
      await sendMessage("clearSiteFaviconCache", undefined);
    },
  },
  {
    title: "清空来自豆瓣、IMDb等信息站点的媒体简介缓存",
    resetFn: async () => {
      await sendMessage("clearSocialInformationCache", undefined);
    },
  },
  {
    title: "清空搜索快照",
    subTitle: "清空所有搜索快照数据",
    resetFn: async () => {
      const metadataStore = useMetadataStore();
      metadataStore.snapshots = {};
      await metadataStore.$save();
      await sendMessage("setExtStorage", { key: "searchResultSnapshot", value: {} });
    },
  },
];

async function resetFnWrapper(resetFn: resetItem["resetFn"]) {
  if (confirm("确定要重置吗？")) {
    await resetFn();
    alert("重置成功");
  }
}
</script>

<template>
  <v-alert type="warning" style="margin-bottom: 10px">
    <v-alert-title> 调试页面！！！！ </v-alert-title>
    所有输出均在console面板！！！
  </v-alert>
  <v-card class="mb-2">
    <v-table>
      <tbody>
        <tr>
          <td>
            <div class="d-flex justify-center align-center text-body-2">启用开发库</div>
          </td>
          <td>
            <v-container>
              <v-row dense>
                <v-col class="d-flex align-center">
                  <v-btn @click="enableLibrary" class="mr-3">启用</v-btn>
                  在console中启用 <code>sendMessage, axios, Sizzle, es-toolkit ( as _ ）, datefns</code> 等方法
                </v-col>
              </v-row>
            </v-container>
          </td>
        </tr>
        <tr>
          <td>
            <div class="d-flex justify-center align-center text-body-2">调试内置站点</div>
          </td>
          <td>
            <v-container>
              <v-row dense>
                <v-col cols="4">
                  <v-autocomplete v-model="selectedSite" :items="definitionList" hide-details label="site" />
                </v-col>
                <v-col cols="2">
                  <v-checkbox v-model="useCustomerConfig" hide-details label="合并用户配置" />
                </v-col>
                <v-col class="d-flex align-center">
                  <v-btn :disabled="!selectedSite" class="mr-2" @click="log(getSiteMetadata())"> 输出站点定义 </v-btn>
                  <v-btn :disabled="!selectedSite" class="mr-2" @click="log(getSiteConfig())"> 输出用户配置信息 </v-btn>
                  <v-btn :disabled="!selectedSite" class="mr-2" @click="log(getSiteInstance())"> 输出站点实例 </v-btn>
                  <v-btn :disabled="!selectedSite" class="mr-2" @click="log(getSiteFavicon())"> 输出Favicon </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </td>
        </tr>
        <tr v-for="(server, serverType) in simpleServer" :key="serverType">
          <td>
            <div class="d-flex justify-center align-center text-body-2">调试{{ serverType }}</div>
          </td>
          <td>
            <v-container>
              <v-row dense>
                <v-col cols="4">
                  <v-autocomplete
                    v-model="simpleServer[serverType].selected"
                    :items="metadataStore[`get${serverType}s` as keyof typeof metadataStore] as any[]"
                    item-title="name"
                    item-value="id"
                    :label="serverType"
                    :messages="`请先在 Set${serverType} 页面添加服务器`"
                  />
                </v-col>
                <v-col class="d-flex align-center">
                  <v-btn
                    :disabled="!server.selected"
                    class="mr-2"
                    @click="
                      // @ts-ignore
                      log(metadataStore[server.piniaKey][server.selected])
                    "
                  >
                    输出用户配置信息
                  </v-btn>
                  <v-btn
                    :disabled="!server.selected"
                    class="mr-2"
                    @click="
                      // @ts-ignore
                      log(server.getFn(metadataStore[server.piniaKey][server.selected]))
                    "
                  >
                    输出 {{ serverType }} 实例
                  </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </td>
        </tr>
        <tr>
          <td>
            <div class="d-flex justify-center align-center text-body-2">调试Pinia</div>
          </td>
          <td>
            <v-container>
              <v-row dense>
                <v-col cols="4">
                  <v-autocomplete
                    v-model="selectedPiniaStore"
                    label="piniaStore"
                    :items="piniaStoreName"
                    hide-details
                  />
                </v-col>
                <v-col class="d-flex align-center">
                  <v-btn class="mr-2" :disabled="!selectedPiniaStore" @click="log(getPiniaStore(selectedPiniaStore))">
                    输出Pinia信息
                  </v-btn>
                </v-col>
              </v-row>
            </v-container>
          </td>
        </tr>
        <tr>
          <td>
            <div class="d-flex justify-center align-center text-body-2">插件重置</div>
          </td>
          <td>
            <v-container>
              <v-row no-gutters>
                <v-col cols="12">
                  <v-alert type="warning" variant="tonal">极其危险！！！！</v-alert>
                </v-col>
                <v-col md="10">
                  <v-list>
                    <v-list-item
                      v-for="item in resetItems"
                      :key="item.title"
                      :title="item.title"
                      :subtitle="item.subTitle"
                      color="primary"
                      rounded
                    >
                      <template v-slot:prepend>
                        <v-list-item-action class="mr-2">
                          <v-btn color="red" @click="() => resetFnWrapper(item.resetFn)">重置</v-btn>
                        </v-list-item-action>
                      </template>
                      <template v-slot:append>
                        <v-select
                          v-if="item.title === '清空站点数据'"
                          v-model="clearSiteTarget"
                          :items="siteSelectItems"
                          label="选择站点"
                          hide-details
                          density="compact"
                          style="min-width: 150px; margin-left: 12px"
                        />
                      </template>
                    </v-list-item>
                  </v-list>
                </v-col>
              </v-row>
            </v-container>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<style scoped lang="scss"></style>
