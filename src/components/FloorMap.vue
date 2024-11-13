<!-- src/components/FloorMap.vue -->
<template>
    <div class="controls">
        <!-- селектор корпуса -->
        <select v-model="selectedBuilding" @change="updateDisplay">
            <option v-for="building in uniqueBuildings" :key="building" :value="building">
                Корпус {{ building }}
            </option>
        </select>
        <!-- селектор этажа если выбран корпус -->
        <select v-model="selectedFloor" @change="updateDisplay" v-if="avaliableFloors.length > 0">
            <option v-for="floor in avaliableFloors" :key="floor" :value="floor">
                Этаж {{ floor }}
            </option>
        </select>
    </div>
    <div class="map-container">
        <!-- <button class="center-button" @click="centerMap">Центрировать</button> -->
        <v-stage ref="stage"
            :config="{ width: computedWidth, height: stageHeight, draggable: true, scale: { x: scale, y: scale } }"
            @wheel="handleZoom">
            <v-layer>
                <!-- отрисовка заливки корпуса -->
                <v-line v-for="(building, index) in filteredBuildings" :key="index" :points="building.points" :config="{
                    closed: true,
                    fill: building.fill || 'gray'
                }" />

                <!-- отрисовка аудиторий -->
                <v-line v-for="(classroom, index) in filteredClassrooms" :key="index" :points="classroom.points"
                    :config="{
                        closed: true,
                        stroke: classroom.color || 'blue',
                        strokeWidth: 1,
                        fill: classroom.fill || 'lightblue'
                    }" />

                <!-- вывод номеров аудиторий по центру -->
                <v-text v-for="(classroom, index) in filteredClassrooms" :key="'text-' + index" :text="classroom.name"
                    :x="(Math.min(...classroom.points.filter((_, i) => i % 2 === 0)) + Math.max(...classroom.points.filter((_, i) => i % 2 === 0)) - getTextWidth(classroom.name) / 2) / 2"
                    :y="(Math.min(...classroom.points.filter((_, i) => i % 2 === 1)) + Math.max(...classroom.points.filter((_, i) => i % 2 === 1)) - 10) / 2"
                    :font-size="20" :font-family="'Arial'" :fill="'black'" :align="'center'"
                    :vertical-align="'middle'" />

                <!-- отрисовка контура корпуса поверх всего -->
                <v-line v-for="(building, index) in filteredBuildings" :key="index" :points="building.points" :config="{
                    closed: true,
                    stroke: building.color || 'black',
                    strokeWidth: 2
                }" />
            </v-layer>
        </v-stage>
    </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

export default {
    name: "FloorMap",
    props: {
        stageWidth: { type: Number, default: 800 },
        stageHeight: { type: Number, default: 600 },
    },
    methods: {
        getTextWidth(text) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = '20px Arial';
            return context.measureText(text).width;
        },
    },
    setup() {
        const scale = ref(1);
        const selectedBuilding = ref(null);
        const selectedFloor = ref(null);

        const buildings = ref([
            {
                points: [  // координаты точек в порядке x1, y1, x2, y2...
                    0, 0, 0, 200, 52, 200, 52, 584, 20, 584,
                    20, 808, 1020, 808, 1020, 0, 752, 0, 752, 152,
                    800, 152, 800, 584, 184, 584, 184, 152, 272, 152,
                    272, 0],
                color: "black",
                fill: "#ccc",
                buildingId: 1,
            },
            {
                points: [0, 0, 0, 200, 400, 200, 400, 0],
                color: "black",
                fill: "#ddd",
                buildingId: 2,
            },
        ]);

        const classrooms = ref([
            {
                points: [0, 0, 0, 200, 52, 200, 52, 152, 272, 152, 272, 0],
                name: "100/1",
                color: "yellow",
                fill: "#ffa",
                buildingId: 1,
                floor: 1
            },
            {
                points: [92, 200, 92, 344, 184, 344, 184, 200],
                name: "101/1",
                color: "blue",
                fill: "#aaf",
                buildingId: 1,
                floor: 1
            },
            {
                points: [92, 344, 92, 392, 184, 392, 184, 344],
                name: "202/1",
                color: "green",
                fill: "#afa",
                buildingId: 1,
                floor: 2
            },
            {
                points: [92, 392, 92, 488, 184, 488, 184, 392],
                name: "203/1",
                color: "red",
                fill: "#faa",
                buildingId: 1,
                floor: 2
            },
            {
                points: [200, 0, 200, 50, 400, 50, 400, 0],
                name: "101/2",
                color: "blue",
                fill: "#aaf",
                buildingId: 2,
                floor: 1
            },
            {
                points: [0, 150, 0, 200, 200, 200, 200, 150],
                name: "102/2",
                color: "green",
                fill: "#afa",
                buildingId: 2,
                floor: 1
            },
            {
                points: [200, 150, 200, 200, 400, 200, 400, 150],
                name: "203/2",
                color: "red",
                fill: "#faa",
                buildingId: 2,
                floor: 2
            },
        ]);

        const computedWidth = ref(800);

        const updateComputedWidth = () => {
            computedWidth.value = Math.min(1700 - 58, window.innerWidth - 58);
        }

        const uniqueBuildings = computed(() => {
            return [...new Set(classrooms.value.map(room => room.buildingId))];
        });

        const avaliableFloors = computed(() => {
            if (!selectedBuilding.value) return [];
            return [...new Set(
                classrooms.value
                    .filter(room => room.buildingId === selectedBuilding.value)
                    .map(room => room.floor)
            )];
        });

        const filteredBuildings = computed(() => {
            return buildings.value.filter(b => b.buildingId === selectedBuilding.value);
        });

        const filteredClassrooms = computed(() => {
            return classrooms.value.filter(room =>
                room.buildingId === selectedBuilding.value && room.floor === selectedFloor.value
            );
        });

        onMounted(() => {
            updateComputedWidth();
            window.addEventListener('resize', updateComputedWidth);

            // пока первый в списке корпус и его первый этаж
            if (uniqueBuildings.value.length > 0) {
                selectedBuilding.value = uniqueBuildings.value[0];
                updateDisplay();
            }
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', updateComputedWidth);
        });

        // масштабирование колесиком мыши
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
            let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

            newScale = Math.max(0.5, Math.min(newScale, 3));
            scale.value = newScale;
            stage.scale({ x: newScale, y: newScale });

            const newPos = {
                x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
                y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale,
            };
            stage.position(newPos);
            stage.batchDraw();
        };

        const updateDisplay = () => {
            if (selectedBuilding.value) {
                // Если текущий выбранный этаж недоступен для выбранного корпуса, сбросить этаж
                if (!avaliableFloors.value.includes(selectedFloor.value)) {
                    selectedFloor.value = avaliableFloors.value.length > 0 ? avaliableFloors.value[0] : null;
                }
            }
        };

        return {
            scale,
            buildings,
            classrooms,
            handleZoom,
            computedWidth,
            selectedBuilding,
            selectedFloor,
            uniqueBuildings,
            avaliableFloors,
            filteredBuildings,
            filteredClassrooms,
            updateDisplay,
            //centerMap
        };
    },
};
</script>

<style scoped>
.map-container {
    border: 1px solid #ddd;
    position: relative;
    margin: 0 auto;
}

.controls {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
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
    border-radius: 4px;
    z-index: 10;
}

.center-button:hover {
    background-color: #2c8c6d;
}
</style>
