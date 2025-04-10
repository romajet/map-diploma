<!-- src/views/FloorMapView.vue -->
<template>
    <div class="floor-map-view">
        <FloorMap />
    </div>
</template>

<script>
import FloorMap from '@/components/FloorMap.vue';

export default {
    name: 'FloorMapView',
    components: {
        FloorMap
    },
};
</script>

<style scoped>
.floor-map-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
}
</style>
