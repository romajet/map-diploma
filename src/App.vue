<!-- src/App.vue -->
<template>
  <div id="app">
    <h1>Список корпусов</h1>
    <BuildingList @building-selected="handleBuildingSelected" />
    <ClassroomTable v-if="selectedBuilding" :building-id="selectedBuilding" />
  </div>
</template>

<script>
import BuildingList from './components/BuildingList.vue';
import ClassroomTable from './components/ClassroomTable.vue';

export default {
  name: 'App',
  components: {
    BuildingList,
    ClassroomTable
  },
  data() {
    return {
      selectedBuilding: null
    };
  },
  methods: {
    handleBuildingSelected(buildingId) {
      this.selectedBuilding = buildingId;
    }
  }
};
</script>

<style>
#app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
</style>
