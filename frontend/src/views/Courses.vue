<template>
  <div class="courses-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课程管理</span>
          <el-button type="primary" @click="showDialog()">
            <el-icon><Plus /></el-icon>
            创建课程
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="课程类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in courseTypes" :key="item.value" :label="item.label" :value="item.value" />
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

      <el-table :data="courses" style="width: 100%">
        <el-table-column prop="title" label="课程名称" min-width="200" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="total_hours" label="学时" width="80" />
        <el-table-column prop="is_required" label="必修" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_required ? 'danger' : 'info'">{{ row.is_required ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
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
            <el-button type="primary" link @click="viewCourse(row)">查看</el-button>
            <el-button type="primary" link @click="editCourse(row)">编辑</el-button>
            <el-button type="danger" link @click="deleteCourse(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑课程' : '创建课程'" width="800px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="课程名称" prop="title">
              <el-input v-model="form.title" placeholder="请输入课程名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="课程类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
                <el-option v-for="item in courseTypes" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="课程描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入课程描述" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="总学时">
              <el-input-number v-model="form.total_hours" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="是否必修">
              <el-switch v-model="form.is_required" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="已发布" value="published" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="目标部门">
          <el-input v-model="form.target_departments" placeholder="多个部门用逗号分隔" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-input v-model="form.target_positions" placeholder="多个岗位用逗号分隔" />
        </el-form-item>
        
        <el-divider>课程章节</el-divider>
        
        <div v-for="(chapter, index) in form.chapters" :key="index" class="chapter-item">
          <el-row :gutter="10">
            <el-col :span="10">
              <el-input v-model="chapter.title" placeholder="章节名称" />
            </el-col>
            <el-col :span="8">
              <el-select v-model="chapter.resource_id" placeholder="选择资源" style="width: 100%">
                <el-option v-for="r in resources" :key="r.id" :label="r.title" :value="r.id" />
              </el-select>
            </el-col>
            <el-col :span="4">
              <el-input-number v-model="chapter.duration" placeholder="时长" :min="0" style="width: 100%" />
            </el-col>
            <el-col :span="2">
              <el-button type="danger" @click="removeChapter(index)" :icon="Delete" circle />
            </el-col>
          </el-row>
        </div>
        <el-button type="primary" plain @click="addChapter" style="margin-top: 10px">
          <el-icon><Plus /></el-icon>
          添加章节
        </el-button>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import api from '../utils/api'

const router = useRouter()

const courseTypes = [
  { value: 'required', label: '必修课' },
  { value: 'elective', label: '选修课' },
  { value: 'position', label: '岗位专属课' },
  { value: 'onboarding', label: '新员工入职课' }
]

const courses = ref([])
const resources = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()

const searchForm = reactive({
  type: '',
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
  type: 'elective',
  total_hours: 0,
  is_required: false,
  target_departments: '',
  target_positions: '',
  status: 'draft',
  created_by: 1,
  chapters: []
})

const rules = {
  title: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const getTypeLabel = (type) => {
  const item = courseTypes.find(t => t.value === type)
  return item ? item.label : type
}

const getTypeTag = (type) => {
  const map = {
    required: 'danger',
    elective: 'success',
    position: 'warning',
    onboarding: 'primary'
  }
  return map[type] || ''
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
    const res = await api.get('/courses', { params })
    courses.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error(error)
  }
}

const fetchResources = async () => {
  try {
    const res = await api.get('/resources', { params: { pageSize: 100 } })
    resources.value = res.list
  } catch (error) {
    console.error(error)
  }
}

const resetSearch = () => {
  searchForm.type = ''
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
      chapters: row.chapters || []
    })
  } else {
    Object.assign(form, {
      id: null,
      title: '',
      description: '',
      type: 'elective',
      total_hours: 0,
      is_required: false,
      target_departments: '',
      target_positions: '',
      status: 'draft',
      created_by: 1,
      chapters: []
    })
  }
  dialogVisible.value = true
}

const viewCourse = (row) => {
  router.push(`/courses/${row.id}`)
}

const editCourse = (row) => {
  showDialog(row)
}

const deleteCourse = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该课程吗？', '提示', { type: 'warning' })
    await api.delete(`/courses/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const addChapter = () => {
  form.chapters.push({
    title: '',
    resource_id: null,
    duration: 0,
    is_required: true
  })
}

const removeChapter = (index) => {
  form.chapters.splice(index, 1)
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  
  try {
    const data = { ...form }
    if (isEdit.value) {
      await api.put(`/courses/${form.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/courses', data)
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
  fetchResources()
})
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}

.chapter-item {
  margin-bottom: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>
