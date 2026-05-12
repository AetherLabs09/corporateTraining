<template>
  <div class="onboarding-page">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>入职培训计划</span>
              <el-button type="primary" @click="showProgramDialog()">
                <el-icon><Plus /></el-icon>
                创建计划
              </el-button>
            </div>
          </template>

          <el-table :data="programs" style="width: 100%">
            <el-table-column prop="title" label="计划名称" min-width="150" />
            <el-table-column prop="duration_days" label="培训周期(天)" width="120" />
            <el-table-column label="包含课程" width="100">
              <template #default="{ row }">
                {{ row.courses?.length || 0 }} 门
              </template>
            </el-table-column>
            <el-table-column prop="is_active" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'">
                  {{ row.is_active ? '激活' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button type="primary" link @click="editProgram(row)">编辑</el-button>
                <el-button type="success" link @click="toggleActive(row)">
                  {{ row.is_active ? '停用' : '激活' }}
                </el-button>
                <el-button type="danger" link @click="deleteProgram(row)">删除</el-button>
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
            <el-button type="primary" @click="autoAssign" style="width: 100%">
              <el-icon><Refresh /></el-icon>
              自动分配入职培训
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>新员工列表</span>
        </div>
      </template>

      <el-table :data="newEmployees" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="position" label="岗位" width="120" />
        <el-table-column prop="entry_date" label="入职日期" width="120" />
        <el-table-column label="培训状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.onboarding" :type="getStatusType(row.onboarding.status)">
              {{ getStatusLabel(row.onboarding.status) }}
            </el-tag>
            <el-tag v-else type="info">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="完成进度" width="150">
          <template #default="{ row }">
            <el-progress v-if="row.onboarding" :percentage="row.onboarding.completion_rate || 0" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button v-if="!row.onboarding" type="primary" link @click="assignProgram(row)">分配培训</el-button>
            <el-button v-else type="primary" link @click="viewProgress(row)">查看进度</el-button>
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
          @size-change="fetchNewEmployees"
          @current-change="fetchNewEmployees"
        />
      </div>
    </el-card>

    <el-dialog v-model="programDialogVisible" :title="isEditProgram ? '编辑计划' : '创建计划'" width="600px">
      <el-form :model="programForm" :rules="programRules" ref="programFormRef" label-width="100px">
        <el-form-item label="计划名称" prop="title">
          <el-input v-model="programForm.title" placeholder="请输入计划名称" />
        </el-form-item>
        <el-form-item label="计划描述">
          <el-input v-model="programForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="培训周期">
          <el-input-number v-model="programForm.duration_days" :min="1" />
          <span style="margin-left: 10px">天</span>
        </el-form-item>
        <el-form-item label="关联课程">
          <el-select v-model="programForm.courses" multiple placeholder="请选择课程" style="width: 100%">
            <el-option v-for="c in courses" :key="c.id" :label="c.title" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="programDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitProgram">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="assignDialogVisible" title="分配入职培训" width="500px">
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="员工">
          <el-input :value="selectedEmployee?.name" disabled />
        </el-form-item>
        <el-form-item label="培训计划">
          <el-select v-model="assignForm.program_id" placeholder="请选择" style="width: 100%">
            <el-option v-for="p in programs" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assigning" @click="submitAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api'

const programs = ref([])
const courses = ref([])
const newEmployees = ref([])
const programDialogVisible = ref(false)
const assignDialogVisible = ref(false)
const isEditProgram = ref(false)
const submitting = ref(false)
const assigning = ref(false)
const programFormRef = ref()
const selectedEmployee = ref(null)

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const programForm = reactive({
  id: null,
  title: '',
  description: '',
  duration_days: 30,
  courses: []
})

const assignForm = reactive({
  user_id: null,
  program_id: null
})

const programRules = {
  title: [{ required: true, message: '请输入计划名称', trigger: 'blur' }]
}

const getStatusLabel = (status) => {
  const map = {
    in_progress: '进行中',
    completed: '已完成'
  }
  return map[status] || status
}

const getStatusType = (status) => {
  const map = {
    in_progress: 'warning',
    completed: 'success'
  }
  return map[status] || 'info'
}

const fetchPrograms = async () => {
  try {
    const res = await api.get('/onboarding/programs')
    programs.value = res
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

const fetchNewEmployees = async () => {
  try {
    const res = await api.get('/onboarding/new-employees', {
      params: { page: pagination.page, pageSize: pagination.pageSize }
    })
    newEmployees.value = res.list
    pagination.total = res.total
  } catch (error) {
    console.error(error)
  }
}

const showProgramDialog = (row = null) => {
  isEditProgram.value = !!row
  if (row) {
    Object.assign(programForm, {
      ...row,
      courses: row.courses?.map(c => c.id) || []
    })
  } else {
    Object.assign(programForm, {
      id: null,
      title: '',
      description: '',
      duration_days: 30,
      courses: []
    })
  }
  programDialogVisible.value = true
}

const editProgram = (row) => {
  showProgramDialog(row)
}

const deleteProgram = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该计划吗？', '提示', { type: 'warning' })
    await api.delete(`/onboarding/programs/${row.id}`)
    ElMessage.success('删除成功')
    fetchPrograms()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

const toggleActive = async (row) => {
  try {
    await api.put(`/onboarding/programs/${row.id}`, {
      ...row,
      is_active: !row.is_active
    })
    ElMessage.success(row.is_active ? '已停用' : '已激活')
    fetchPrograms()
  } catch (error) {
    console.error(error)
  }
}

const submitProgram = async () => {
  await programFormRef.value.validate()
  submitting.value = true
  
  try {
    if (isEditProgram.value) {
      await api.put(`/onboarding/programs/${programForm.id}`, programForm)
      ElMessage.success('更新成功')
    } else {
      await api.post('/onboarding/programs', programForm)
      ElMessage.success('创建成功')
    }
    programDialogVisible.value = false
    fetchPrograms()
  } catch (error) {
    console.error(error)
  } finally {
    submitting.value = false
  }
}

const assignProgram = (row) => {
  selectedEmployee.value = row
  assignForm.user_id = row.id
  assignForm.program_id = programs.value.find(p => p.is_active)?.id || null
  assignDialogVisible.value = true
}

const submitAssign = async () => {
  if (!assignForm.program_id) {
    ElMessage.warning('请选择培训计划')
    return
  }
  
  assigning.value = true
  try {
    await api.post('/onboarding/assign', assignForm)
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    fetchNewEmployees()
  } catch (error) {
    console.error(error)
  } finally {
    assigning.value = false
  }
}

const autoAssign = async () => {
  try {
    const res = await api.post('/onboarding/auto-assign')
    ElMessage.success(`自动分配完成，共分配 ${res.assigned} 人`)
    fetchNewEmployees()
  } catch (error) {
    console.error(error)
  }
}

const viewProgress = (row) => {
  ElMessage.info('查看进度功能开发中')
}

onMounted(() => {
  fetchPrograms()
  fetchCourses()
  fetchNewEmployees()
})
</script>

<style scoped>
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
