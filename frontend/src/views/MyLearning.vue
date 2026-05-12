<template>
  <div class="my-learning-page">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>我的课程</span>
            </div>
          </template>

          <el-table :data="myCourses" style="width: 100%">
            <el-table-column prop="course_title" label="课程名称" min-width="200" />
            <el-table-column prop="course_type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.course_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="进度" width="150">
              <template #default="{ row }">
                <el-progress :percentage="row.progress || 0" />
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="last_access_time" label="最近学习" width="180">
              <template #default="{ row }">
                {{ formatDate(row.last_access_time) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button type="primary" link @click="continueLearning(row)">继续学习</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>学习统计</span>
            </div>
          </template>
          <div class="stat-item">
            <div class="stat-label">总课程数</div>
            <div class="stat-value">{{ summary.totalCourses }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">已完成</div>
            <div class="stat-value">{{ summary.completedCourses }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">学习中</div>
            <div class="stat-value">{{ summary.inProgressCourses }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">完成率</div>
            <el-progress :percentage="summary.completionRate" :stroke-width="15" />
          </div>
        </el-card>

        <el-card style="margin-top: 20px" v-if="isOnboarding">
          <template #header>
            <div class="card-header">
              <span>入职培训进度</span>
            </div>
          </template>
          <div class="onboarding-info">
            <p><strong>培训计划：</strong>{{ onboardingInfo.program_title }}</p>
            <p><strong>开始日期：</strong>{{ onboardingInfo.start_date }}</p>
            <p><strong>完成进度：</strong></p>
            <el-progress :percentage="onboardingInfo.completion_rate || 0" :stroke-width="15" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import api from '../utils/api'

const userStore = useUserStore()

const myCourses = ref([])
const summary = ref({
  totalCourses: 0,
  completedCourses: 0,
  inProgressCourses: 0,
  completionRate: 0
})
const onboardingInfo = ref({})

const isOnboarding = computed(() => userStore.user?.is_new_employee)

const getStatusLabel = (status) => {
  const map = {
    not_started: '未开始',
    in_progress: '学习中',
    completed: '已完成'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    not_started: 'info',
    in_progress: 'warning',
    completed: 'success'
  }
  return map[status] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchMyProgress = async () => {
  if (!userStore.user?.id) return
  
  try {
    const res = await api.get(`/progress/user/${userStore.user.id}`)
    myCourses.value = res.progress
    summary.value = res.summary
  } catch (error) {
    console.error(error)
  }
}

const fetchOnboardingProgress = async () => {
  if (!userStore.user?.id || !userStore.user.is_new_employee) return
  
  try {
    const res = await api.get(`/onboarding/user/${userStore.user.id}/progress`)
    onboardingInfo.value = res
  } catch (error) {
    console.error(error)
  }
}

const continueLearning = (row) => {
  console.log('继续学习', row)
}

onMounted(() => {
  fetchMyProgress()
  if (isOnboarding.value) {
    fetchOnboardingProgress()
  }
})
</script>

<style scoped>
.stat-item {
  margin-bottom: 20px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.onboarding-info p {
  margin-bottom: 10px;
}
</style>
