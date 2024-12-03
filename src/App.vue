<!-- src/App.vue -->
<template>
    <router-view />
</template>

<script>
export default {
    name: 'App'
};
</script>

<style>
#app {
    /* с границей у карты плюс 2px к 1700px, поэтому такая цифра */
    max-width: 1702px;
    margin: 0 auto;
    /* padding: 5px; */
}
</style>
