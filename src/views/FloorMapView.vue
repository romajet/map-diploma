<!-- src/views/FloorMapView.vue -->
<template>
    <div class="floor-map-view">
        <h1>тест интерактивной карты этажа</h1>
        <FloorMap :stageWidth="mapWidth" :stageHeight="600" />
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import FloorMap from '@/components/FloorMap.vue';

export default {
    name: 'FloorMapView',
    components: {
        FloorMap
    },
    setup() {
        const mapWidth = ref(Math.min(1700, window.innerWidth));

        const updateWidth = () => {
            const appContainer = document.getElementById('app');
            const containerWidth = appContainer ? appContainer.clientWidth : window.innerWidth;
            mapWidth.value = Math.min(1700, containerWidth);
        };

        onMounted(() => {
            updateWidth();
            window.addEventListener('resize', updateWidth);
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', updateWidth);
        });

        return { mapWidth };
    }
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
