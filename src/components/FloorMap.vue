<!-- src/components/FloorMap.vue -->
<template>
    <div class="controls">
        <!-- селектор корпуса -->
        <select v-model="selectedBuilding" @change="updateDisplay" class="styled-select">
            <option v-for="building in uniqueBuildings" :key="building" :value="building">
                Корпус {{ building }}
            </option>
        </select>
        <!-- селектор этажа если выбран корпус -->
        <select v-model="selectedFloor" @change="updateDisplay" v-if="avaliableFloors.length > 0" class="styled-select">
            <option v-for="floor in avaliableFloors" :key="floor" :value="floor">
                Этаж {{ floor }}
            </option>
        </select>
    </div>
    <div class="map-container">
        <v-stage ref="stage"
            :config="{ width: computedWidth, height: computedHeight, draggable: true, scale: { x: scale, y: scale } }"
            @wheel="handleZoom"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd">
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
                        fill: getFillColor(classroom.name)
                    }" />

                <!-- вывод номеров аудиторий по центру -->
                <v-text v-for="(classroom, index) in filteredClassrooms" :key="'text-' + index" :text="classroom.number"
                    :x="(Math.min(...classroom.points.filter((_, i) => i % 2 === 0)) + Math.max(...classroom.points.filter((_, i) => i % 2 === 0)) - getTextWidth(classroom.number) / 2) / 2"
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
import axios from 'axios';

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
        const buildings = ref([]);
        const classrooms = ref([]);
        const computedWidth = ref(800);
        const computedHeight = ref(600);

        let initialDistance = null;
        let initialScale = 1;

        const handleTouchStart = (event) => {
            if (event.touches && event.touches.length === 2) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                if (touch1 && touch2) {
                    initialDistance = getDistance(touch1, touch2);
                    initialSize = scale.value;
                }
            }
        };

        const handleTouchMove = (event) => {
            if (event.touches && event.touches.length === 2 && initialDistance != null) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                if (touch1 && touch2) {
                    const newDistance = getDistance(touch1, touch2);
                    const scaleFactor = newDistance / initialDistance;
                    const newScale = initialScale * scaleFactor;
                    scale.value = Math.max(0.5, Math.min(newScale, 3));
                    const stage = event.target.getStage();
                    stage.scale({ x: scale.value, y: scale.value });
                    stage.batchDraw();
                }
                
            }
        };

        const handleTouchEnd = () => {
            initialDistance = null;
        };

        const getDistance = (touch1, touch2) => {
            if (touch1 && touch2) {
                const dx = touch2.clientX - touch1.clientX;
                const dy = touch2.clientY - touch1.clientY;
                return Math.sqrt(dx * dx + dy * dy);
            }
            return 0;
        };

        const getFillColor = (name) => {
            if (name.includes("Лестница"))
                return "LightCyan";
            else if (name.includes("Муж"))
                return "SkyBlue";
            else if (name.includes("Жен"))
                return "Pink";
            else
                return "lightblue";
        }

        const updateComputedSize = () => {
            const avaliableHeight = window.innerHeight - 79;
            computedWidth.value = Math.min(1700 - 58, window.innerWidth - 58);
            computedHeight.value = avaliableHeight > 400 ? avaliableHeight : 400;
        };

        const fetchBuildings = async () => {
            try {
                const response = await axios.get('xml-data/buildings.xml', {
                    responseType: 'text'
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'application/xml');
                const buildingElements = xmlDoc.getElementsByTagName('Building');

                buildings.value = Array.from(buildingElements).map((el) => ({
                    buildingId: el.getElementsByTagName('Id')[0].textContent,
                    name: el.getElementsByTagName('Name')[0].textContent,
                    points: Array.from(el.getElementsByTagName('Point')).flatMap(p => p.textContent.split(',').map(Number)),
                }));
            } catch (error) {
                console.error('ошибка загрузки корпусов из файла: ', error);
            }
        };

        const fetchClassrooms = async (buildingId) => {
            try {
                const response = await axios.get(`xml-data/classrooms_${buildingId}.xml`, {
                    responseType: 'text'
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'application/xml');
                const roomElements = xmlDoc.getElementsByTagName('Room');

                classrooms.value = Array.from(roomElements).map((el) => ({
                    floor: el.getElementsByTagName('Floor')[0].textContent,
                    name: el.getElementsByTagName('Name')[0].textContent,
                    number: el.getElementsByTagName('Number')[0].textContent,
                    points: el.getElementsByTagName('Coordinates')[0]
                        .getAttribute('points').split(' ').flatMap(p => p.split(',').map(Number)),
                    buildingId
                }));
            } catch (error) {
                console.error('ошибка загрузки корпусов из файла: ', error);
            }
        };

        const uniqueBuildings = computed(() => {
            return buildings.value.map(building => building.buildingId);
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

        onMounted(async () => {
            updateComputedSize();
            window.addEventListener('resize', updateComputedSize);
            await fetchBuildings();
            if (buildings.value.length > 0) {
                selectedBuilding.value = buildings.value[0].buildingId;
                await fetchClassrooms(selectedBuilding.value);
                updateDisplay();
            }
        });

        onBeforeUnmount(() => {
            window.removeEventListener('resize', updateComputedSize);
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

        const updateDisplay = async () => {
            if (selectedBuilding.value) {
                await fetchClassrooms(selectedBuilding.value);
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
            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
            getFillColor,
            computedWidth,
            computedHeight,
            selectedBuilding,
            selectedFloor,
            uniqueBuildings,
            avaliableFloors,
            filteredBuildings,
            filteredClassrooms,
            updateDisplay,
            fetchBuildings,
            fetchClassrooms,
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

.styled-select {
    padding: 5px;
    font-size: 16px;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    color: #333;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s, border-color 0.3s;
}

.styled-select:hover {
    background-color: #e6f7ff;
    border-color: #66afe9;
}

.styled-select:focus {
    outline: none;
    background-color: #f5fcff;
    border-color: #66afe9;
}

.controls {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}
</style>
