<template>
  <div class="plans-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>培训计划管理</span>
          <el-button type="primary" @click="showDialog()">
            <el-icon><Plus /></el-icon>
            创建计划
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="计划类型">
          <el-select v-model="searchForm.plan_type" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in planTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入关键词" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="plans" style="width: 100%">
        <el-table-column prop="title" label="计划名称" min-width="200" />
        <el-table-column prop="plan_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag>{{ getTypeLabel(row.plan_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_date" label="开始日期" width="120" />
        <el-table-column prop="end_date" label="结束日期" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'draft'" type="success" link @click="publishPlan(row)">发布</el-button>
            <el-button type="primary" link @click="editPlan(row)">编辑</el-button>
            <el-button type="danger" link @click="deletePlan(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑计划' : '创建计划'" width="800px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="计划名称" prop="title">
              <el-input v-model="form.title" placeholder="请输入计划名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="计划类型" prop="plan_type">
              <el-select v-model="form.plan_type" placeholder="请选择类型" style="width: 100%">
                <el-option v-for="item in planTypes" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="计划描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入计划描述" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期">
              <el-date-picker v-model="form.start_date" type="date" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期">
              <el-date-picker v-model="form.end_date" type="date" placeholder="选择日期" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="目标部门">
          <el-input v-model="form.target_departments" placeholder="多个部门用逗号分隔" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-input v-model="form.target_positions" placeholder="多个岗位用逗号分隔" />
        </el-form-item>
        <el-form-item label="关联课程">
          <el-select v-model="form.courses" multiple placeholder="请选择课程" style="width: 100%">
            <el-option v-for="c in courses" :key="c.id" :label="c.title" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="学习要求">
          <el-input v-model="form.requirements" type="textarea" :rows="2" placeholder="请输入学习要求" />
        </el-form-item>
        <el-form-item label="考核标准">
          <el-input v-model="form.assessment_standard" type="textarea" :rows="2" placeholder="请输入考核标准" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const planTypes = [
  { value: 'yearly', label: '年度计划' },
  { value: 'quarterly', label: '季度计划' },
  { value: 'monthly', label: '月度计划' }
]

const plans = ref([])
const courses = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const searchForm = reactive({
  plan_type: '',
  status: '',
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: null,
  title: '',
  description: '',
  plan_type: 'monthly',
  start_date: '',
  end_date: '',
  target_departments: '',
  target_positions: '',
  target_users: [],
  courses: [],
  requirements: '',
  assessment_standard: '',
  status: 'draft',
  created_by: 1
})

const rules = {
  title: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  plan_type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const getTypeLabel = (type) => {
  const item = planTypes.find(t => t.value === type)
  return item ? item.label : type
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const fetchData = async () => {
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await api.get('/plans', { params })
    plans.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error(error)
  }
}

const fetchCourses = async () => {
  try {
    const res = await api.get('/courses', { params: { pageSize: 100 } })
    courses.value = res.list
  } catch (error) {
    console.error(error)
  }
}

const resetSearch = () => {
  searchForm.plan_type = ''
  searchForm.status = ''
  searchForm.keyword = ''
  pagination.page = 1
  fetchData()
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, {
      ...row,
      target_departments: row.target_departments ? JSON.parse(row.target_departments).join(',') : '',
      target_positions: row.target_positions ? JSON.parse(row.target_positions).join(',') : '',
      courses: row.courses ? JSON.parse(row.courses) : []
    })
  } else {
    Object.assign(form, {
      id: null,
      title: '',
      description: '',
      plan_type: 'monthly',
      start_date: '',
      end_date: '',
      target_departments: '',
      target_positions: '',
      target_users: [],
      courses: [],
      requirements: '',
      assessment_standard: '',
      status: 'draft',
      created_by: 1
    })
  }
  dialogVisible.value = true
}

const editPlan = (row) => {
  showDialog(row)
}

const deletePlan = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该计划吗？', '提示', { type: 'warning' })
    await api.delete(`/plans/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const publishPlan = async (row) => {
  try {
    await ElMessageBox.confirm('确定要发布该计划吗？发布后将通知相关人员。', '提示', { type: 'warning' })
    const res = await api.post(`/plans/${row.id}/publish`)
    ElMessage.success(`发布成功，已通知 ${res.targetCount} 人`)
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  
  try {
    const data = {
      ...form,
      target_departments: form.target_departments ? form.target_departments.split(',').map(s => s.trim()) : [],
      target_positions: form.target_positions ? form.target_positions.split(',').map(s => s.trim()) : []
    }
    
    if (data.start_date) {
      data.start_date = new Date(data.start_date).toISOString().split('T')[0]
    }
    if (data.end_date) {
      data.end_date = new Date(data.end_date).toISOString().split('T')[0]
    }
    
    if (isEdit.value) {
      await api.put(`/plans/${form.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/plans', data)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchCourses()
})
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
</style>
