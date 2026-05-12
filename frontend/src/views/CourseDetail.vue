<template>
  <div class="course-detail">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">{{ course.title }}</span>
      </template>
    </el-page-header>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="18">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>课程信息</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="课程名称">{{ course.title }}</el-descriptions-item>
            <el-descriptions-item label="课程类型">
              <el-tag>{{ getTypeLabel(course.type) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="总学时">{{ course.total_hours }} 小时</el-descriptions-item>
            <el-descriptions-item label="是否必修">
              <el-tag :type="course.is_required ? 'danger' : 'info'">{{ course.is_required ? '是' : '否' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="course.status === 'published' ? 'success' : 'info'">
                {{ course.status === 'published' ? '已发布' : '草稿' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(course.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="课程描述" :span="2">{{ course.description || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card style="margin-top: 20px">
          <template #header>
            <div class="card-header">
              <span>课程章节</span>
            </div>
          </template>
          <el-table :data="chapters" style="width: 100%">
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="title" label="章节名称" />
            <el-table-column prop="resource_type" label="资源类型" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.resource_type" size="small">{{ row.resource_type }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="时长(分钟)" width="100" />
            <el-table-column prop="is_required" label="必修" width="80">
              <template #default="{ row }">
                {{ row.is_required ? '是' : '否' }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>学习统计</span>
            </div>
          </template>
          <div class="stat-item">
            <div class="stat-label">已报名人数</div>
            <div class="stat-value">{{ summary.totalEnrolled }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">已完成</div>
            <div class="stat-value">{{ summary.completed }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">学习中</div>
            <div class="stat-value">{{ summary.inProgress }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">完成率</div>
            <el-progress :percentage="summary.completionRate" :stroke-width="15" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../utils/api'

const route = useRoute()

const courseTypes = [
  { value: 'required', label: '必修课' },
  { value: 'elective', label: '选修课' },
  { value: 'position', label: '岗位专属课' },
  { value: 'onboarding', label: '新员工入职课' }
]

const course = ref({})
const chapters = ref([])
const summary = ref({
  totalEnrolled: 0,
  completed: 0,
  inProgress: 0,
  completionRate: 0
})

const getTypeLabel = (type) => {
  const item = courseTypes.find(t => t.value === type)
  return item ? item.label : type
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchData = async () => {
  try {
    const res = await api.get(`/courses/${route.params.id}`)
    course.value = res
    chapters.value = res.chapters || []
  } catch (error) {
    console.error(error)
  }
}

const fetchProgress = async () => {
  try {
    const res = await api.get(`/progress/course/${route.params.id}`)
    summary.value = res.summary
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  fetchData()
  fetchProgress()
})
</script>

<style scoped>
.page-title {
  font-size: 18px;
  font-weight: 500;
}

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
</style>
