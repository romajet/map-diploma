<!-- src/components/FloorMap.vue -->
<template>
    <div class="map-container">
        <!-- <button class="center-button" @click="centerMap">Центрировать</button> -->
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

                <!-- Текст для каждой аудитории -->
                <v-text v-for="(classroom, index) in classrooms" :key="'text-' + index" :text="classroom.name"
                    :x="(Math.min(...classroom.points.filter((_, i) => i % 2 === 0)) + Math.max(...classroom.points.filter((_, i) => i % 2 === 0))) / 2"
                    :y="(Math.min(...classroom.points.filter((_, i) => i % 2 === 1)) + Math.max(...classroom.points.filter((_, i) => i % 2 === 1))) / 2"
                    :font-size="20" :font-family="'Arial'" :fill="'black'" :align="'center'"
                    :vertical-align="'middle'" />
            </v-layer>
        </v-stage>
    </div>
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
                points: [0, 0, 0, 200, 52, 200, 52, 584, 20, 584,
                    20, 808, 1020, 808, 1020, 0, 752, 0, 752, 152,
                    800, 152, 800, 584, 184, 584, 184, 152, 272, 152,
                    272, 0],
                color: "black",
                fill: "#ccc",
            },
        ]);

        const classrooms = ref([
            {
                points: [92, 200, 92, 344, 184, 344, 184, 200],
                name: "101/1",
                color: "blue",
                fill: "#aaf",
            },
            {
                points: [92, 344, 92, 392, 184, 392, 184, 344],
                name: "102/1",
                color: "green",
                fill: "#afa",
            },
            {
                points: [92, 392, 92, 488, 184, 488, 184, 392],
                name: "103/1",
                color: "red",
                fill: "#faa",
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

        return {
            scale,
            buildings,
            classrooms,
            handleZoom,
            //centerMap
        };
    },
};
</script>

<style scoped>
.map-container {
    border: 1px solid #ddd;
    position: relative;
    width: 800px;
    height: 600px;
}

.center-button {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 8px 16px;
    background-color: #42b983;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    z-index: 10;
}

.center-button:hover {
    background-color: #2c8c6d;
}
</style>
