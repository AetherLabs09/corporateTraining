<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #409EFF">
              <el-icon size="32"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">学员总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #67C23A">
              <el-icon size="32"><Reading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalCourses }}</div>
              <div class="stat-label">课程总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #E6A23C">
              <el-icon size="32"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPlans }}</div>
              <div class="stat-label">培训计划</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-icon" style="background: #F56C6C">
              <el-icon size="32"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completedCourses }}</div>
              <div class="stat-label">已完成学习</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>各部门学习进度</span>
            </div>
          </template>
          <el-table :data="departmentProgress" style="width: 100%">
            <el-table-column prop="department" label="部门" />
            <el-table-column prop="total" label="总人数" width="100" />
            <el-table-column prop="completed" label="已完成" width="100" />
            <el-table-column prop="inProgress" label="学习中" width="100" />
            <el-table-column prop="notStarted" label="未开始" width="100" />
            <el-table-column label="完成率" width="200">
              <template #default="{ row }">
                <el-progress :percentage="row.completionRate" :stroke-width="10" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/resources')">
              <el-icon><Folder /></el-icon>
              上传资源
            </el-button>
            <el-button type="success" @click="$router.push('/courses')">
              <el-icon><Reading /></el-icon>
              创建课程
            </el-button>
            <el-button type="warning" @click="$router.push('/plans')">
              <el-icon><Calendar /></el-icon>
              发布计划
            </el-button>
            <el-button type="info" @click="$router.push('/students')">
              <el-icon><User /></el-icon>
              添加学员
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api'

const stats = ref({
  totalUsers: 0,
  totalCourses: 0,
  totalPlans: 0,
  completedCourses: 0,
  inProgressCourses: 0
})

const departmentProgress = ref([])

const fetchData = async () => {
  try {
    const overview = await api.get('/progress/overview')
    stats.value = overview
    
    const deptProgress = await api.get('/progress/department')
    departmentProgress.value = deptProgress
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.quick-actions .el-button {
  width: 100%;
  justify-content: flex-start;
}
</style>
