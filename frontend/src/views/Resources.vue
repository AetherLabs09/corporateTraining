<template>
  <div class="resources-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>培训资源库</span>
          <el-button type="primary" @click="showDialog()">
            <el-icon><Plus /></el-icon>
            上传资源
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="资源类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="item in resourceTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="searchForm.department" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入关键词" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="resources" style="width: 100%">
        <el-table-column prop="title" label="资源名称" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="120" />
        <el-table-column prop="course_type" label="课程类型" width="100" />
        <el-table-column prop="file_size" label="文件大小" width="100">
          <template #default="{ row }">
            {{ formatFileSize(row.file_size) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="上传时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="editResource(row)">编辑</el-button>
            <el-button type="danger" link @click="deleteResource(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑资源' : '上传资源'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="资源名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入资源名称" />
        </el-form-item>
        <el-form-item label="资源类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option v-for="item in resourceTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="上传文件" prop="file">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :file-list="fileList"
          >
            <el-button type="primary">选择文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tags" placeholder="多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="form.position" placeholder="请输入岗位" />
        </el-form-item>
        <el-form-item label="课程类型">
          <el-input v-model="form.course_type" placeholder="如：必修课、选修课" />
        </el-form-item>
        <el-form-item label="时长(分钟)">
          <el-input-number v-model="form.duration" :min="0" />
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

const resourceTypes = [
  { value: 'video', label: '视频' },
  { value: 'document', label: '文档' },
  { value: 'courseware', label: '课件' },
  { value: 'audio', label: '音频' },
  { value: 'image', label: '图文' }
]

const resources = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref()
const uploadRef = ref()
const fileList = ref([])
const selectedFile = ref(null)

const searchForm = reactive({
  type: '',
  department: '',
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
  type: '',
  description: '',
  tags: '',
  department: '',
  position: '',
  course_type: '',
  duration: 0,
  created_by: 1
})

const rules = {
  title: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const getTypeLabel = (type) => {
  const item = resourceTypes.find(t => t.value === type)
  return item ? item.label : type
}

const getTypeTag = (type) => {
  const map = {
    video: 'primary',
    document: 'success',
    courseware: 'warning',
    audio: 'info',
    image: ''
  }
  return map[type] || ''
}

const formatFileSize = (size) => {
  if (!size) return '-'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / (1024 * 1024)).toFixed(2) + ' MB'
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
    const res = await api.get('/resources', { params })
    resources.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error(error)
  }
}

const resetSearch = () => {
  searchForm.type = ''
  searchForm.department = ''
  searchForm.keyword = ''
  pagination.page = 1
  fetchData()
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, row)
    fileList.value = []
  } else {
    Object.assign(form, {
      id: null,
      title: '',
      type: '',
      description: '',
      tags: '',
      department: '',
      position: '',
      course_type: '',
      duration: 0,
      created_by: 1
    })
    fileList.value = []
  }
  selectedFile.value = null
  dialogVisible.value = true
}

const editResource = (row) => {
  showDialog(row)
}

const deleteResource = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该资源吗？', '提示', { type: 'warning' })
    await api.delete(`/resources/${row.id}`)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const submitForm = async () => {
  await formRef.value.validate()
  submitting.value = true
  
  try {
    const formData = new FormData()
    Object.keys(form).forEach(key => {
      if (form[key] !== null && form[key] !== undefined && key !== 'id') {
        formData.append(key, form[key])
      }
    })
    
    if (selectedFile.value) {
      formData.append('file', selectedFile.value)
    }
    
    if (isEdit.value) {
      await api.put(`/resources/${form.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      ElMessage.success('更新成功')
    } else {
      await api.post('/resources', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      ElMessage.success('上传成功')
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
})
</script>

<style scoped>
.search-form {
  margin-bottom: 20px;
}
</style>
