<template>
  <div class="students-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>学员管理</span>
          <div>
            <el-button type="success" @click="showImportDialog">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button type="primary" @click="showDialog()">
              <el-icon><Plus /></el-icon>
              添加学员
            </el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="部门">
          <el-input v-model="searchForm.department" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="searchForm.position" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="新员工">
          <el-select v-model="searchForm.is_new_employee" placeholder="全部" clearable style="width: 120px">
            <el-option label="是" :value="1" />
            <el-option label="否" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/用户名" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="students" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="entry_date" label="入职日期" width="120" />
        <el-table-column prop="is_new_employee" label="新员工" width="80">
          <template #default="{ row }">
            <el-tag :type="row.is_new_employee ? 'success' : 'info'" size="small">
              {{ row.is_new_employee ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : ''" size="small">
              {{ row.role === 'admin' ? '管理员' : '学员' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="editStudent(row)">编辑</el-button>
            <el-button type="danger" link @click="deleteStudent(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑学员' : '添加学员'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="岗位">
          <el-input v-model="form.position" placeholder="请输入岗位" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="入职日期">
          <el-date-picker v-model="form.entry_date" type="date" placeholder="选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="学员" value="student" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="批量导入学员" width="600px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px">
        <p>请按以下格式准备CSV文件：</p>
        <p>用户名,姓名,部门,岗位,邮箱,电话,入职日期</p>
        <p>示例：zhangsan,张三,技术部,工程师,zhangsan@example.com,13800138000,2024-01-01</p>
      </el-alert>
      <el-input
        v-model="importText"
        type="textarea"
        :rows="10"
        placeholder="请粘贴CSV数据，每行一条记录"
      />
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="importStudents">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const students = ref([])
const dialogVisible = ref(false)
const importDialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const importing = ref(false)
const formRef = ref()
const importText = ref('')

const searchForm = reactive({
  department: '',
  position: '',
  is_new_employee: null,
  keyword: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: null,
  username: '',
  name: '',
  password: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  entry_date: '',
  role: 'student'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }]
}

const fetchData = async () => {
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const res = await api.get('/students', { params })
    students.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error(error)
  }
}

const resetSearch = () => {
  searchForm.department = ''
  searchForm.position = ''
  searchForm.is_new_employee = null
  searchForm.keyword = ''
  pagination.page = 1
  fetchData()
}

const showDialog = (row = null) => {
  isEdit.value = !!row
  if (row) {
    Object.assign(form, row)
  } else {
    Object.assign(form, {
      id: null,
      username: '',
      name: '',
      password: '',
      department: '',
      position: '',
      email: '',
      phone: '',
      entry_date: '',
      role: 'student'
    })
  }
  dialogVisible.value = true
}

const editStudent = (row) => {
  showDialog(row)
}

const deleteStudent = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该学员吗？', '提示', { type: 'warning' })
    await api.delete(`/students/${row.id}`)
    ElMessage.success('删除成功')
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
    const data = { ...form }
    if (data.entry_date) {
      data.entry_date = new Date(data.entry_date).toISOString().split('T')[0]
    }
    
    if (isEdit.value) {
      await api.put(`/students/${form.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await api.post('/students', data)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const showImportDialog = () => {
  importText.value = ''
  importDialogVisible.value = true
}

const importStudents = async () => {
  if (!importText.value.trim()) {
    ElMessage.warning('请输入数据')
    return
  }
  
  importing.value = true
  try {
    const lines = importText.value.trim().split('\n')
    const students = lines.map(line => {
      const [username, name, department, position, email, phone, entry_date] = line.split(',')
      return { username, name, department, position, email, phone, entry_date }
    })
    
    const res = await api.post('/students/batch', { students })
    ElMessage.success(`导入完成：成功 ${res.successCount} 条，失败 ${res.failCount} 条`)
    importDialogVisible.value = false
    fetchData()
  } catch (error) {
    console.error(error)
  } finally {
    importing.value = false
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
