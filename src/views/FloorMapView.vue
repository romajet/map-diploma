<!-- src/views/FloorMapView.vue -->
<template>
    <div>
        <h1>тест интерактивной карты этажа</h1>
        <FloorMap :stageWidth="800" :stageHeight="600" />
    </div>
</template>

<script>
import FloorMap from '@/components/FloorMap.vue';

export default {
    name: 'FloorMapView',
    components: {
        FloorMap
    }
};
</script>
