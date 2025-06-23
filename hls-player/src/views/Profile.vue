<template>
  <div>
    <h2>User Profile</h2>
    <p v-if="authStore.isLoading">Loading user information...</p>
    <div v-else-if="authStore.isAuthenticated && authStore.user">
      <p><strong>Username:</strong> {{ authStore.user.preferred_username }}</p>
      <p><strong>Email:</strong> {{ authStore.user.email }}</p>
      <p><strong>Full Name:</strong> {{ authStore.user.name }}</p>
    </div>
    <p v-else>You are not logged in.</p>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
</script>

<style scoped>
div {
  padding: 2rem;
  text-align: left;
}
</style>
