<template>
  <el-container class="main-layout">
    <el-aside width="220px">
      <div class="logo">
        <h3>培训学习系统</h3>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><HomeFilled /></el-icon>
          <span>首页概览</span>
        </el-menu-item>
        
        <el-sub-menu index="resource">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>资源管理</span>
          </template>
          <el-menu-item index="/resources">培训资源库</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="course">
          <template #title>
            <el-icon><Reading /></el-icon>
            <span>课程管理</span>
          </template>
          <el-menu-item index="/courses">课程列表</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="student">
          <template #title>
            <el-icon><User /></el-icon>
            <span>人员管理</span>
          </template>
          <el-menu-item index="/students">学员管理</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="plan">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>培训计划</span>
          </template>
          <el-menu-item index="/plans">计划列表</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="progress">
          <template #title>
            <el-icon><DataLine /></el-icon>
            <span>进度管理</span>
          </template>
          <el-menu-item index="/progress">学习进度</el-menu-item>
        </el-sub-menu>
        
        <el-sub-menu index="onboarding">
          <template #title>
            <el-icon><UserFilled /></el-icon>
            <span>入职培训</span>
          </template>
          <el-menu-item index="/onboarding">入职培训专区</el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/my-learning">
          <el-icon><Collection /></el-icon>
          <span>我的学习</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header>
        <div class="header-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.user?.name || '用户' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta.title || '首页')

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #263445;
}

.logo h3 {
  color: #fff;
  font-size: 16px;
}

.header-left .page-title {
  font-size: 18px;
  font-weight: 500;
}

.header-right .user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
</style>
