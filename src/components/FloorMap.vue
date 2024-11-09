<!-- src/components/FloorMap.vue -->
<template>
    <v-stage ref="stage"
        :config="{ width: stageWidth, height: stageHeight, draggable: true, scale: { x: scale, y: scale } }"
        @wheel="handleZoom">
        <v-layer>
            <v-line v-for="(building, index) in buildings" :key="index" :points="building.points" :config="{
                closed: true,
                stroke: building.color || 'black',
                strokeWidth: 2,
                fill: building.fill || 'gray'
            }" />

            <v-line v-for="(classroom, index) in classrooms" :key="index" :points="classroom.points" :config="{
                closed: true,
                stroke: classroom.color || 'blue',
                strokeWidth: 1,
                fill: classroom.fill || 'lightblue'
            }" />
        </v-layer>
    </v-stage>
</template>

<script>
import { ref } from "vue";

export default {
    name: "FloorMap",
    props: {
        stageWidth: {
            type: Number,
            default: 800,
        },
        stageHeight: {
            type: Number,
            default: 600,
        },
    },
    setup() {
        const scale = ref(1);

        // Пример координат для корпуса и аудиторий
        const buildings = ref([
            {
                points: [50, 50, 200, 50, 200, 200, 50, 200], // 4 точки
                color: "black",
                fill: "#ccc",
            },
        ]);

        const classrooms = ref([
            {
                points: [80, 80, 180, 80, 180, 180, 80, 180], // 4 точки
                color: "blue",
                fill: "#aaf",
            },
            {
                points: [220, 50, 370, 50, 370, 200, 220, 200], // другая аудитория
                color: "green",
                fill: "#afa",
            },
        ]);

        // Обработка колесика мыши для масштабирования
        const handleZoom = (event) => {
            event.evt.preventDefault();
            const scaleBy = 1.1;
            const stage = event.target.getStage();
            const oldScale = stage.scaleX();
            const mousePointTo = {
                x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
                y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
            };

            const direction = event.evt.deltaY > 0 ? -1 : 1;
            const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

            scale.value = newScale;
            stage.scale({ x: newScale, y: newScale });

            const newPos = {
                x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
                y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
            };
            stage.position(newPos);
            stage.batchDraw();
        };

        return { scale, buildings, classrooms, handleZoom };
    },
};
</script>

<style scoped>
/* Стили для контейнера карты */
.konvajs-content {
    border: 1px solid #ddd;
}
</style>
