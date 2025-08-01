<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, shallowRef } from "vue";
import { pickBy } from "es-toolkit";
import { isEmpty } from "es-toolkit/compat";
import { EResultParseStatus, ISiteMetadata, ISiteUserConfig, TSiteID } from "@ptd/site";

import { sendMessage } from "@/messages.ts";
import { useRuntimeStore } from "@/options/stores/runtime.ts";
import { useMetadataStore } from "@/options/stores/metadata.ts";
import { useResetableRef } from "@/options/directives/useResetableRef.ts";

import SiteFavicon from "@/options/components/SiteFavicon.vue";
import CheckSwitchButton from "@/options/components/CheckSwitchButton.vue";

import { getCanAddedSiteMetadata } from "./utils.ts";

const showDialog = defineModel<boolean>();

interface IImportStatus {
  isWorking: boolean;
  toWork: TSiteID[];
  working: TSiteID;
  success: TSiteID[];
  failed: TSiteID[];
}

const { ref: importStatus, reset: resetImportStatus } = useResetableRef<IImportStatus>(() => ({
  isWorking: false,
  toWork: [],
  working: "",
  success: [],
  failed: [],
}));

const { t } = useI18n();
const runtimeStore = useRuntimeStore();
const metadataStore = useMetadataStore();

// 获取所有能添加的站点
const canAddSites = shallowRef<Record<TSiteID, ISiteMetadata>>({});

const realCanAutoAddSiteId = computed(() =>
  Object.values(canAddSites.value)
    .filter((x) => !x.userInputSettingMeta && x.type === "private")
    .map((x) => x.id),
);

const statusIconPropComputed = (site: TSiteID) =>
  computed(() => {
    let progressIcon = "progress-helper"; // 默认
    let progressColor = "grey";
    let progressTitle = "";
    if (canAddSites.value[site]?.userInputSettingMeta) {
      progressIcon = "progress-close"; // 需要手动添加
      progressColor = "purple";
      progressTitle = t("SetSite.oneClickImportDialog.status.manual");
    } else if (importStatus.value.working === site) {
      progressIcon = "progress-wrench"; // 正在尝试中
      progressColor = "blue";
      progressTitle = t("SetSite.oneClickImportDialog.status.trying");
    } else if (importStatus.value.success.includes(site)) {
      progressIcon = "progress-check"; // 已添加成功
      progressColor = "green";
      progressTitle = t("SetSite.oneClickImportDialog.status.success");
    } else if (importStatus.value.failed.includes(site)) {
      progressIcon = "progress-alert"; // 添加失败
      progressColor = "red";
      progressTitle = t("SetSite.oneClickImportDialog.status.failed");
    } else if (importStatus.value.toWork.includes(site)) {
      progressIcon = "progress-pencil"; // 已选择
      progressColor = "";
      progressTitle = t("SetSite.oneClickImportDialog.status.selected");
    }

    return {
      icon: `mdi-${progressIcon}`,
      color: progressColor,
      title: progressTitle,
    };
  });

async function doAutoImport() {
  importStatus.value.isWorking = true;
  importStatus.value.failed = [];

  // 遍历所有需要添加的站点
  for (const site of importStatus.value.toWork) {
    if (importStatus.value.success.includes(site)) {
      continue; // 如果已经添加成功，则跳过
    }

    importStatus.value.working = site;

    try {
      let isThisSiteSuccess = false;

      // 拿到 siteMetadata, siteUserConfig
      const siteMetadata = canAddSites.value[site] as ISiteMetadata;
      const siteUserConfig = (await metadataStore.getSiteUserConfig(site, true)) as ISiteUserConfig;

      // 对于 public 站点，不需要额外测试是否能够搜索
      if (siteMetadata.type === "public") {
        await metadataStore.addSite(site, siteUserConfig); // 直接将该站点设置存入 metadataStore
        isThisSiteSuccess = true;
      } else {
        // 遍历所有 private site 预设的 urls ，找到用户实际使用的 url
        for (const siteUrl of siteMetadata.urls) {
          siteUserConfig.url = siteUrl;
          await metadataStore.addSite(site, siteUserConfig); // 临时将该设置存入 metadataStore
          const { status: testStatus } = await sendMessage("getSiteSearchResult", { siteId: site });
          if (testStatus === EResultParseStatus.success) {
            isThisSiteSuccess = true; // 如果搜索成功，说明该站点可以自动添加
            break;
          }
        }
      }

      if (isThisSiteSuccess) {
        importStatus.value.success.push(site);
      } else {
        importStatus.value.failed.push(site);
        await metadataStore.removeSite(site); // 如果搜索失败，说明该站点不能自动添加，移除在 metadataStore 中临时添加的配置项
      }
    } catch (e) {
      importStatus.value.failed.push(site);
    }
  }

  importStatus.value.working = "";
  importStatus.value.isWorking = false;
  importStatus.value.toWork = [];

  runtimeStore.showSnakebar(`一键导入完成，成功添加 ${importStatus.value.success.length} 个站点`, { color: "success" });
}

async function dialogEnter() {
  resetImportStatus(); // 重置状态
  const allCanAddedSite = await getCanAddedSiteMetadata(); // 加载待添加站点
  canAddSites.value = pickBy(allCanAddedSite, (site) => site.isDead !== true) as Record<string, ISiteMetadata>;
}
</script>

<template>
  <v-dialog
    v-model="showDialog"
    max-width="1000"
    scrollable
    @after-enter="dialogEnter"
    :persistent="importStatus.isWorking"
  >
    <v-card>
      <v-card-title class="pa-0">
        <v-toolbar color="blue-grey-darken-2">
          <v-toolbar-title>{{ t("SetSite.oneClickImportDialog.title") }}</v-toolbar-title>
          <template #append>
            <v-btn icon="mdi-close" @click="showDialog = false" :disabled="importStatus.isWorking" />
          </template>
        </v-toolbar>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-alert class="mb-2" :title="t('SetSite.oneClickImportDialog.alert1')" type="warning" variant="tonal">
        </v-alert>

        <v-alert class="mb-1 py-2" :title="t('SetSite.oneClickImportDialog.alert2')">
          <template #text>
            {{
              t("SetSite.oneClickImportDialog.stats", {
                count: importStatus.toWork.length,
                success: importStatus.success.length,
                failed: importStatus.failed.length,
              })
            }}
            <span v-if="importStatus.isWorking">
              {{ t("SetSite.oneClickImportDialog.trying", { name: canAddSites[importStatus.working].name }) }}
            </span>
          </template>
          <template #append>
            <CheckSwitchButton
              v-model="importStatus.toWork"
              :all="realCanAutoAddSiteId"
              :size="undefined"
              color="blue-lighten-1"
              variant="tonal"
            />
          </template>
        </v-alert>

        <v-skeleton-loader v-if="isEmpty(canAddSites)" type="image"> </v-skeleton-loader>
        <v-list else class="overflow-x-hidden overflow-y-hidden px-3 pt-3">
          <v-row>
            <v-col v-for="site in canAddSites" :key="site.id" cols="12" md="4" sm="6" class="pa-1">
              <v-list-item border class="bg-grey-lighten-4">
                <template #prepend>
                  <v-checkbox
                    v-model="importStatus.toWork"
                    :indeterminate="!!site.userInputSettingMeta || importStatus.success.includes(site.id)"
                    :indeterminate-icon="importStatus.success.includes(site.id) ? 'mdi-check' : 'mdi-close'"
                    :disabled="
                      !!site.userInputSettingMeta || importStatus.isWorking || importStatus.success.includes(site.id)
                    "
                    :value="site.id"
                    hide-details
                    multiple
                  />
                  <SiteFavicon :site-id="site.id" class="mr-2" flush-on-click />
                </template>

                <template #title>
                  <v-list-item-title>
                    <b>{{ site.name ?? "" }}</b>
                    <!-- 站点类型 -->
                  </v-list-item-title>
                </template>

                <template #subtitle>
                  <v-chip :color="site.type === 'private' ? 'primary' : 'secondary'" label size="x-small">
                    {{ site.schema ?? (site.type === "private" ? "AbstractPrivateSite" : "AbstractBittorrentSite") }}
                  </v-chip>
                </template>

                <template #append>
                  <v-list-item-action>
                    <a :href="site.urls[0]" target="_blank" rel="noopener noreferrer nofollow">
                      <v-icon v-bind="statusIconPropComputed(site.id).value" class="mr-2" size="x-large"></v-icon>
                    </a>
                  </v-list-item-action>
                </template>
              </v-list-item>
            </v-col>
          </v-row>
        </v-list>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          :disabled="importStatus.isWorking"
          color="error"
          prepend-icon="mdi-close-circle"
          variant="text"
          @click="showDialog = false"
        >
          {{ t("common.dialog.cancel") }}
        </v-btn>

        <v-btn
          :disabled="importStatus.isWorking"
          color="success"
          prepend-icon="mdi-import"
          variant="text"
          @click="doAutoImport"
        >
          {{ t("common.import") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss"></style>
