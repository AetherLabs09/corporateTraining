import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页概览' }
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('../views/Resources.vue'),
        meta: { title: '培训资源库' }
      },
      {
        path: 'courses',
        name: 'Courses',
        component: () => import('../views/Courses.vue'),
        meta: { title: '课程管理' }
      },
      {
        path: 'courses/:id',
        name: 'CourseDetail',
        component: () => import('../views/CourseDetail.vue'),
        meta: { title: '课程详情' }
      },
      {
        path: 'students',
        name: 'Students',
        component: () => import('../views/Students.vue'),
        meta: { title: '学员管理' }
      },
      {
        path: 'plans',
        name: 'Plans',
        component: () => import('../views/Plans.vue'),
        meta: { title: '培训计划' }
      },
      {
        path: 'progress',
        name: 'Progress',
        component: () => import('../views/Progress.vue'),
        meta: { title: '学习进度' }
      },
      {
        path: 'onboarding',
        name: 'Onboarding',
        component: () => import('../views/Onboarding.vue'),
        meta: { title: '入职培训' }
      },
      {
        path: 'my-learning',
        name: 'MyLearning',
        component: () => import('../views/MyLearning.vue'),
        meta: { title: '我的学习' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth !== false && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router
