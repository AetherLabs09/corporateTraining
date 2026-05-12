<template>
  <div class="progress-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>学习进度跟踪</span>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="部门">
          <el-input v-model="searchForm.department" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="课程">
          <el-select v-model="searchForm.course_id" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="c in courses" :key="c.id" :label="c.title" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchNotCompleted">查看未完成</el-button>
        </el-form-item>
      </el-form>

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
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="remindDepartment(row)">一键催学</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>未完成学员列表</span>
          <el-button type="warning" @click="batchRemind" :disabled="selectedUsers.length === 0">
            批量提醒 ({{ selectedUsers.length }})
          </el-button>
        </div>
      </template>

      <el-table :data="notCompletedUsers" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="remindUser(row)">提醒</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="remindDialogVisible" title="发送学习提醒" width="500px">
      <el-form :model="remindForm" label-width="80px">
        <el-form-item label="提醒内容">
          <el-input v-model="remindForm.message" type="textarea" :rows="3" placeholder="请输入提醒内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remindDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="reminding" @click="sendRemind">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../utils/api'

const courses = ref([])
const departmentProgress = ref([])
const notCompletedUsers = ref([])
const selectedUsers = ref([])
const remindDialogVisible = ref(false)
const reminding = ref(false)

const searchForm = reactive({
  department: '',
  course_id: ''
})

const remindForm = reactive({
  user_ids: [],
  course_id: null,
  message: ''
})

const fetchCourses = async () => {
  try {
    const res = await api.get('/courses', { params: { pageSize: 100 } })
    courses.value = res.list
  } catch (error) {
    console.error(error)
  }
}

const fetchDepartmentProgress = async () => {
  try {
    const res = await api.get('/progress/department')
    departmentProgress.value = res
  } catch (error) {
    console.error(error)
  }
}

const fetchNotCompleted = async () => {
  try {
    const params = {}
    if (searchForm.department) params.department = searchForm.department
    if (searchForm.course_id) params.course_id = searchForm.course_id
    
    const res = await api.get('/progress/not-completed', { params })
    notCompletedUsers.value = res
  } catch (error) {
    console.error(error)
  }
}

const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

const remindDepartment = async (row) => {
  remindForm.user_ids = notCompletedUsers.value
    .filter(u => u.department === row.department)
    .map(u => u.id)
  remindForm.course_id = searchForm.course_id
  remindForm.message = '请尽快完成您的学习任务！'
  remindDialogVisible.value = true
}

const remindUser = (row) => {
  remindForm.user_ids = [row.id]
  remindForm.course_id = searchForm.course_id
  remindForm.message = '请尽快完成您的学习任务！'
  remindDialogVisible.value = true
}

const batchRemind = () => {
  remindForm.user_ids = selectedUsers.value.map(u => u.id)
  remindForm.course_id = searchForm.course_id
  remindForm.message = '请尽快完成您的学习任务！'
  remindDialogVisible.value = true
}

const sendRemind = async () => {
  reminding.value = true
  try {
    await api.post('/progress/remind', remindForm)
    ElMessage.success('提醒发送成功')
    remindDialogVisible.value = false
  } catch (error) {
    console.error(error)
  } finally {
    reminding.value = false
  }
}

onMounted(() => {
  fetchCourses()
  fetchDepartmentProgress()
  fetchNotCompleted()
})
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
</style>
