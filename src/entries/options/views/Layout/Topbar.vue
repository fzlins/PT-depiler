<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { useRoute, useRouter } from "vue-router";

import { useConfigStore } from "@/options/stores/config.ts";
import { useMetadataStore } from "@/options/stores/metadata.ts";
import { useRuntimeStore } from "@/options/stores/runtime.ts";

import { REPO_URL } from "~/helper";

const route = useRoute();
const router = useRouter();
const display = useDisplay();
const { t } = useI18n();

const configStore = useConfigStore();
const metadataStore = useMetadataStore();
const runtimeStore = useRuntimeStore();

const appendMenu = computed<Array<{ title: string; icon: string; [str: string]: any }>>(() => [
  { title: t("layout.header.home"), icon: "mdi-home", href: REPO_URL },
  { title: t("layout.header.wiki"), icon: "mdi-help-circle", href: `${REPO_URL}/wiki` },
]);

const searchKey = ref((route.query?.search as string) ?? "");
const searchPlanKey = ref((route.query?.plan as string) ?? "default");

const searchPlans = computed(() =>
  metadataStore.getSearchSolutions
    .filter((x) => !!x.enabled) // 过滤掉未启用的搜索方案
    .sort((a, b) => b.sort - a.sort) // 按照 sort 降序排序
    .map((x) => ({
      id: x.id,
      name: x.name,
    })),
);

function startSearchEntity() {
  router.push({
    name: "SearchEntity",
    query: {
      search: searchKey.value,
      plan: searchPlanKey.value,
      flush: 1,
    },
  });
}

function advanceSearch(type?: string) {
  searchKey.value = (type ? type + "|" : "") + searchKey.value.replace(/^\w+\|/, ""); // 移除已有的搜索类型前缀
  startSearchEntity();
}
</script>

<template>
  <v-app-bar id="ptd-topbar" app color="amber">
    <template #prepend>
      <v-app-bar-nav-icon
        :title="t('layout.header.navBarTip')"
        variant="text"
        @click="configStore.isNavBarOpen = !configStore.isNavBarOpen"
      >
        <template v-if="display.smAndUp.value">
          <v-icon icon="$menu"></v-icon>
        </template>
        <template v-else>
          <v-img inline src="/icons/logo/64.png" width="24"></v-img>
        </template>
      </v-app-bar-nav-icon>
    </template>

    <v-app-bar-title v-show="display.smAndUp.value" ref="titleTarget" style="min-width: 120px; max-width: 160px">
      <v-img inline src="/icons/logo/64.png" width="24"></v-img>
      {{ t("manifest.extName") }}
    </v-app-bar-title>

    <!-- 搜索输入框 -->
    <v-combobox
      v-model="searchKey"
      :placeholder="t('layout.header.searchTip')"
      class="ptd-search-input pl-2"
      hide-details
      style="width: 300px"
      @keydown.enter="startSearchEntity"
    >
      <template #append>
        <!-- 搜索按键 -->
        <v-btn :disabled="runtimeStore.search.isSearching" icon="mdi-magnify" @click="startSearchEntity" />
      </template>

      <template #prepend-inner>
        <!-- 搜索方案选择框 -->
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" color="primary">
              {{
                searchPlanKey == "default"
                  ? t("layout.header.searchPlan.default")
                  : metadataStore.getSearchSolutionName(searchPlanKey)
              }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              :subtitle="
                '<' +
                (metadataStore.defaultSolutionId !== 'default'
                  ? metadataStore.getSearchSolutionName(metadataStore.defaultSolutionId)
                  : t('layout.header.searchPlan.all')) +
                '>'
              "
              :title="t('layout.header.searchPlan.default')"
              @click="() => (searchPlanKey = 'default')"
            ></v-list-item>
            <v-divider />
            <v-list-item
              v-for="(item, index) in searchPlans"
              :key="index"
              :value="index"
              @click="() => (searchPlanKey = item.id)"
            >
              <v-list-item-title>{{ metadataStore.getSearchSolutionName(item.id) }}</v-list-item-title>
            </v-list-item>
            <template v-if="metadataStore.defaultSolutionId !== 'default'">
              <v-divider />
              <v-list-item
                :title="t('layout.header.searchPlan.all')"
                @click="() => (searchPlanKey = 'all')"
              ></v-list-item>
            </template>
          </v-list>
        </v-menu>
      </template>
    </v-combobox>

    <v-spacer v-if="display.smAndUp.value" />

    <template #append>
      <!-- 处于大屏幕，完整显示所有btn -->
      <template v-if="!display.mdAndDown.value">
        <v-btn
          v-for="(append, index) in appendMenu"
          :key="index"
          v-bind.prop="append.prop"
          :append-icon="append.icon"
          :href="append.href"
          :title="append.title"
          rel="noopener noreferrer nofollow"
          size="large"
          target="_blank"
          variant="text"
        >
          <span class="ml-1">{{ append.title }}</span>
        </v-btn>
      </template>

      <!-- 处于小屏幕，只显示点，btn以menu列表形式展示 -->
      <template v-else>
        <v-menu bottom left offset-y>
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>

          <v-list>
            <v-list-item
              v-for="(item, index) in appendMenu"
              :key="index"
              :href="item.href"
              :prepend-icon="item.icon"
              :title="item.title"
              variant="text"
              rel="noopener noreferrer nofollow"
              size="large"
              class="menu-item list-item-none-spacer"
              target="_blank"
            />
          </v-list>
        </v-menu>
      </template>
    </template>
  </v-app-bar>
</template>

<style scoped lang="scss">
.menu-item:deep(.v-list-item__prepend > .v-icon) {
  margin-inline-end: 16px;
}

.ptd-search-input:deep(.v-input__append) {
  padding-top: 4px;
}
</style>
