<!-- src/views/BuildingListView.vue -->
<template>
    <div class="building-list-view">
        <BuildingList @building-selected="goToMapView" />
    </div>
</template>

<script>
import BuildingList from '@/components/BuildingList.vue';

export default {
    name: 'BuildingListView',
    components: { BuildingList },
    methods: {
        goToMapView(buildingId) {
            this.$router.push({name: "floorMap", query: { korpus: buildingId, floor: 1 }});
        }
    }
};
</script>

<style scoped>
.building-list-view {
    padding: 20px;
}
</style>
