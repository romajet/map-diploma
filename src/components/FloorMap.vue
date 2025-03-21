<!-- src/components/FloorMap.vue -->
<template>
    <div class="floor-map">
        <div class="floor-map__controls">
            <!-- возврат к списку корпусов -->
            <!-- <button @click="goToHome" class="floor-map__button floor-map__button--home">Дом</button> -->
            <button @click="goToHome" class="floor-map__button floor-map__button--home" title="К выбору корпусов">
                <IconHome />
            </button>
            <!-- селектор корпуса -->
            <select v-model="selectedBuilding" @change="onBuildingChange"
                class="floor-map__select floor-map__select--building">
                <option v-for="building in buildings" :key="building.buildingId" :value="building.buildingId">
                    {{ building.shortname }} - {{ building.name }}
                </option>
            </select>
            <!-- селектор этажа -->
            <select v-if="selectedBuilding" v-model="selectedFloor" @change="onFloorChange"
                class="floor-map__select floor-map__select--floor">
                <option v-for="floor in avaliableFloors" :key="floor" :value="floor">
                    Этаж {{ floor }}
                </option>
            </select>
            <!-- кнопка центрирования -->
            <!-- <button @click="centerMap" class="floor-map__button floor-map__button--center">Центр.</button> -->
            <button @click="centerMap" class="floor-map__button floor-map__button--center" title="Центрировать">
                <IconFrame />
            </button>
        </div>

        <div class="floor-map__modal-container">
            <!-- затемнение фона -->
            <div v-if="isModalOpen" class="floor-map__overlay" @click="closeModal"></div>
            <!-- расписание для аудитории -->
            <div v-if="isModalOpen" class="floor-map__modal">
                <h3 class="floor-map__modal-title">{{ selectedClassroomNumber }} - {{ selectedClassroomName }}</h3>
                <!-- <h4 class="floor-map__modal-type">{{ selectedClassroomType }}</h4> -->
                <div v-if="scheduleData.length" class="floor-map__schedule">
                    <div v-for="(entry, index) in scheduleData" :key="index" :class="['floor-map__schedule-item', getScheduleClass(entry.type)]">
                        <div class="floor-map__schedule-time">
                            <span class="floor-map__schedule-time-start">{{ entry.start_time }}</span>
                            <span class="floor-map__schedule-time-end">{{ entry.end_time }}</span>
                        </div>
                        <div class="floor-map__schedule-details">
                            <div class="floor-map__schedule-type">
                                {{ entry.type }}</div>
                            <div class="floor-map__schedule-subject">{{ entry.subject }}</div>
                            <div class="floor-map__schedule-teacher">{{ entry.teacher }}</div>
                            <div class="floor-map__schedule-groups">{{ entry.groups }}</div>
                        </div>
                    </div>
                </div>
                <p v-else class="floor-map__no-schedule">нет данных о расписании</p>
                <button class="floor-map__button floor-map__button--close" @click="closeModal">закрыть</button>
            </div>
        </div>

        <div class="floor-map__container">
            <!-- контейнер для svg -->
            <svg
                :width="computedWidth"
                :height="computedHeight"
                @wheel="handleZoom"
                @mousedown="startPan"
                @mousemove="panMap"
                @mouseup="endPan"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
                class="floor-map__svg">
                <!-- группа для масштабирования и параномирования -->
                <g :transform="'translate(' + panX + ', ' + panY + ') scale(' + scale + ')'"
                    class="floor-map__svg-content">
                    <!-- отрисовка заполнения корпуса -->
                    <g v-for="(building, index) in filteredBuildings" :key="index"
                    class="floor-map__building">
                        <polygon
                            :points="formatPoints(building.points)"
                            :fill="building.fill || 'gray'"
                            stroke-width="0"
                            class="floor-map__building-fill"
                        />
                    </g>
                    <!-- отрисовка аудиторий -->
                    <g v-for="(classroom, index) in filteredClassrooms" :key="'classroom' + index"
                    :class="['floor-map__classroom', getClassroomClass(classroom.type)]">
                        <!-- внешний вид -->
                        <polygon
                            :points="formatPoints(classroom.points)"
                            :fill="getFillColor(classroom.name)"
                            stroke="blue"
                            stroke-width="1"
                            class="floor-map__classroom-polygon"
                        />
                        <!-- текст по центру аудитории -->
                        <text
                            :x="calculateText(classroom.points).x"
                            :y="calculateText(classroom.points).y"
                            text-anchor="middle"
                            alignment-baseline="middle"
                            font-size="14"
                            font-family="Arial"
                            fill="black"
                            style="user-select: none;"
                            class="floor-map__classroom-number"
                        >
                            {{ classroom.number }}
                        </text>
                    </g>
                    <!-- отрисовка граней корпуса -->
                    <g v-for="(building, index) in filteredBuildings" :key="index"
                    class="floor-map__building">
                        <polygon
                            :points="formatPoints(building.points)"
                            fill-opacity="0"
                            stroke="black"
                            stroke-width="2"
                            class="floor-map__building-stroke"
                        />
                    </g>
                    <!-- отрисовка аудиторий -->
                    <g v-for="(classroom, index) in filteredClassrooms" :key="'classroom' + index"
                    class="floor-map__classroom">
                        <!-- прозрачный полигон для обработки нажатия -->
                        <polygon
                            :points="formatPoints(classroom.points)"
                            fill-opacity="0"
                            stroke-opacity="0"
                            stroke-width="1"
                            @click="handleClassroomClick(classroom)"
                            class="floor-map__classroom-clickable"
                        />
                    </g>
                </g>
            </svg>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
import axios from "../axios";
import router from '@/router';
import polylabel from "polylabel";
import { IconHome, IconFrame } from "@tabler/icons-vue";

export default {
    name: "FloorMap",
    components: {
        IconFrame,
        IconHome
    },
    props: {
        stageWidth: { type: Number, default: 800 },
        stageHeight: { type: Number, default: 600 },
    },
    methods: {
        getClassroomClass(type) {
            if (!type) return 'floor-map__classroom--default';

            switch (type) {
                case 'Учебная лаборатория':
                    return 'floor-map__classroom--edu-lab';
                case 'Учебная аудитория':
                    return 'floor-map__classroom--lecture';
                case 'Административное помещение':
                    return 'floor-map__classroom--admin';
                case 'Научная лаборатория':
                    return 'floor-map__classroom--sci-lab';
                case 'Помещение административно-хозяйственной части':
                    return 'floor-map__classroom--ahch';
                case 'Компьютерный класс':
                    return 'floor-map__classroom--comp';
                default:
                    return 'floor-map__classroom--default';
            }
        },

        getScheduleClass(type) {
            if (!type) return 'floor-map__schedule-item--default';

            switch (type) {
                case 'Практические занятия и семинары':
                    return 'floor-map__schedule-item--practice';
                case 'Лабораторные занятия':
                    return 'floor-map__schedule-item--lab';
                case 'Лекции':
                    return 'floor-map__schedule-item--lecture';
                case 'Экзамен':
                case 'Зачет':
                    return 'floor-map__schedule-item--exam';
                case 'Консультация к промежуточной аттестции':
                    return 'floor-map__schedule-item--cosult';
                case 'Курсовой проект':
                    return 'floor-map__schedule-item--project';
                default:
                    return 'floor-map__schedule-item--default';
            }
        },

        goToHome() {
            router.push({ name: 'BuildingList' });
        },

        // Форматирование точек для SVG-полигона
        formatPoints(points) {
            if (!Array.isArray(points) || points.length === 0) {
                console.warn("Неверные данные для points:", points);
                return "";
            }
            // console.log(points);
            return points
                .map(point => {
                    // Проверка на наличие координат x и y
                    if (point && typeof point.x === 'number' && typeof point.y === 'number' && !isNaN(point.x) && !isNaN(point.y)) {
                        return `${point.x},${point.y}`;
                    } else {
                        console.warn("Неверная точка:", point);
                        return null;
                    }
                })
                .filter(Boolean) // Убираем все null значения
                .join(" ");
        },

        // Центр аудитории для размещения текста
        calculateText(points) {
            const polylabelCoordinates = points.map(point => [point.x, point.y]);
            const centerPoint = polylabel([polylabelCoordinates], 1.0);
            return { x: centerPoint[0], y: centerPoint[1] };
        }
    },
    setup() {
        const computedWidth = ref(800);
        const computedHeight = ref(600);

        const scale = ref(1);
        const panX = ref(0);
        const panY = ref(0);
        const startX = ref(0);
        const startY = ref(0);
        const isPanning = ref(false);

        const buildings = ref([]);
        const classrooms = ref([]);
        const filteredBuildings = ref([]);
        const filteredClassrooms = ref([]);

        const isModalOpen = ref(false);
        const selectedClassroomName = ref("");
        const selectedClassroomNumber = ref("");
        const selectedClassroomType = ref("");
        const scheduleData = ref([]);

        const selectedBuilding = ref(null);
        const selectedBuildingShortName = ref('');
        const selectedFloor = ref(1);
        const avaliableFloors = ref([]);

        const floorDataLoaded = ref(false);

        let isDragging = false;
        let dragThreshold = 5; // порог перемещения в пикселях для отмены нажатия

        let initialTouchDistance = null;
        let initialScale = 1;

        const minScale = 0.2;
        const maxScale = 5;

        // Масштабирование относительно мыши
        const handleZoom = (event) => {
            event.preventDefault();
            const scaleBy = 1.1;

            const direction = event.deltaY > 0 ? -1 : 1;
            const oldScale = scale.value;
            const newScale = Math.max(minScale, Math.min(oldScale * (direction > 0 ? scaleBy : 1 / scaleBy), maxScale));

            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left - panX.value) / oldScale;
            const mouseY = (event.clientY - rect.top - panY.value) / oldScale;

            panX.value -= (mouseX * newScale - mouseX * oldScale);
            panY.value -= (mouseY * newScale - mouseY * oldScale);

            scale.value = newScale;
        };

        // Начало панорамирования
        const startPan = (event) => {
            isPanning.value = true;
            isDragging = false; // Сбрасываем флаг перемещения
            startX.value = event.clientX - panX.value;
            startY.value = event.clientY - panY.value;
        };

        // Панорамирование карты
        const panMap = (event) => {
            if (isPanning.value) {
                const deltaX = Math.abs(event.clientX - startX.value);
                const deltaY = Math.abs(event.clientY - startY.value);

                // устанавливаем флаг, если перемещение превышает порог
                if (deltaX > dragThreshold || deltaY > dragThreshold) {
                    isDragging = true;
                }

                panX.value = event.clientX - startX.value;
                panY.value = event.clientY - startY.value;
            }
        };

        // Завершение панорамирования
        const endPan = () => {
            isPanning.value = false;
        };

        // Обработка клика и касания по аудитории
        const handleClassroomClick = (classroom) => {
            if (!isDragging) {
                // console.log("Нажата аудитория:", classroom);
                fetchSchedule(classroom);
            } else {
                console.log("Перемещение карты, нажатие на аудиторию отменено");
            }
        };

        // Начало взаимодействия с сенсорным экраном
        const handleTouchStart = (event) => {
            if (event.touches.length === 2) {
                // Если два пальца касаются экрана, начинаем жест масштабирования
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                initialTouchDistance = getDistanceBetweenTouches(touch1, touch2);
                initialScale = scale.value;
            } else if (event.touches.length === 1) {
                // Если один палец касается экрана, начинаем перетаскивание
                isPanning.value = true;
                startX.value = event.touches[0].clientX - panX.value;
                startY.value = event.touches[0].clientY - panY.value;
            }
        };

        // Обработка движения касания
        const handleTouchMove = (event) => {
            if (event.touches.length === 2 && initialTouchDistance != null) {
                // Жест масштабирования двумя пальцами
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = getDistanceBetweenTouches(touch1, touch2);
                const scaleFactor = currentDistance / initialTouchDistance;
                const newScale = Math.max(minScale, Math.min(initialScale * scaleFactor, maxScale));

                // Центрирование масштабирования
                const rect = event.currentTarget.getBoundingClientRect();
                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left - panX.value;
                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top - panY.value;

                panX.value -= (centerX / scale.value) * (newScale - scale.value);
                panY.value -= (centerY / scale.value) * (newScale - scale.value);

                scale.value = newScale;
            } else if (event.touches.length === 1 && isPanning.value) {
                // Перетаскивание одним пальцем
                panX.value = event.touches[0].clientX - startX.value;
                panY.value = event.touches[0].clientY - startY.value;
            }
        };

        // Завершение сенсорного взаимодействия
        const handleTouchEnd = () => {
            initialTouchDistance = null;
            isPanning.value = false;
        };

        // Вспомогательная функция для вычисления расстояния между двумя касаниями
        const getDistanceBetweenTouches = (touch1, touch2) => {
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        // центрирование корпуса
        const centerMap = () => {
            let targetPoints = [];

            if (filteredBuildings.value[0]?.points?.length) {
                targetPoints = filteredBuildings.value[0].points;
            }
            else if (filteredClassrooms.value.length) {
                targetPoints = filteredClassrooms.value.flatMap((classroom) => classroom.points);
            }

            if (targetPoints.length) {
                const xCoords = targetPoints.map((p) => p.x);
                const yCoords = targetPoints.map((p) => p.y);

                const minX = Math.min(...xCoords);
                const maxX = Math.max(...xCoords);
                const minY = Math.min(...yCoords);
                const maxY = Math.max(...yCoords);

                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;

                const width = maxX - minX;
                const height = maxY - minY;

                const containerWidth = computedWidth.value;
                const containerHeight = computedHeight.value;

                const scaleX = containerWidth / (width + 20);
                const scaleY = containerHeight / (height + 20);
                const optimalScale = Math.min(scaleX, scaleY, maxScale);

                scale.value = optimalScale;
                panX.value = computedWidth.value / 2 - centerX * scale.value;
                panY.value = computedHeight.value / 2 - centerY * scale.value;
            } else {
                console.warn("нет данных для центрирования");
            }
        };

        // Цвет для аудиторий по названию
        const getFillColor = (name) => {
            if (name) {
                if (name.includes("Лестница")) return "LightCyan";
                if (name.includes("Муж")) return "SkyBlue";
                if (name.includes("Жен")) return "Pink";
                return "lightblue";
            }
            return "lightblue";
        };

        // получение расписания
        const fetchSchedule = (classroom) => {
            selectedClassroomName.value = classroom.name;
            selectedClassroomNumber.value = classroom.number;
            selectedClassroomType.value = classroom.type;
            console.log(selectedClassroomType.value);
            isModalOpen.value = true;

            axios.get(`/schedule/roomId/${classroom.id}`).then(res => {
                scheduleData.value = res.data.map(el => {
                    const [startTime, endTime] = el.Period.split('-');
                    let Type = '-';
                    console.log(el.Type);
                    switch (el.Type) {
                        case "лек.":
                            Type = "Лекции";
                            break;
                        case "лаб.":
                            Type = "Лабораторные занятия";
                            break;
                        case 'практ.зан.  и семин.':
                            Type = "Практические занятия и семинары";
                            break;
                    }
                    return {
                        groups: el.Groups,
                        id: el.Id,
                        start_time: startTime.trim().slice(0, 5),
                        end_time: endTime.trim().slice(0, 5),
                        subject: el.Subject,
                        teacher: el.Teacher,
                        type: Type
                    };
                });
                scheduleData.value.sort((a, b) => {
                    const timeA = new Date(`1970-01-01T${a.start_time}:00`).getTime();
                    const timeB = new Date(`1970-01-01T${b.start_time}:00`).getTime();
                    return timeA - timeB;
                })
            }).catch(error => {
                console.error('что-то создает ошибки при загрузке расписания:', error);
                scheduleData.value = [];
            });
        };

        const closeModal = () => {
            isModalOpen.value = false;
            scheduleData.value = [];
        };

        const fetchBuildings = async () => {
            try {
                const res = await axios.get('/buildings');
                buildings.value = res.data.map((el) => ({
                    buildingId: el.Id,
                    name: el.Name,
                    shortname: el.ShortName
                }));
                selectedBuilding.value = buildings.value[0].buildingId;
                selectedBuildingShortName.value = buildings.value[0].shortname;
                onBuildingChange();
            } catch (error) {
                console.error('что-то создает ошибки загрузки корпусов: ', error);
            }
        };

        const onBuildingChange = async () => {
            if (selectedBuilding.value) {
                floorDataLoaded.value = false;

                classrooms.value = [];
                filteredClassrooms.value = [];
                avaliableFloors.value = [];
                filteredBuildings.value = [];

                const selectedBuildingInfo = buildings.value.find(
                    (building) => building.buildingId === selectedBuilding.value
                );
                selectedBuildingShortName.value = selectedBuildingInfo.shortname;

                await fetchClassrooms(selectedBuilding.value);

                if (avaliableFloors.value.length > 0) {
                    const { floor } = router.currentRoute.value.query;
                    const floorNumber = Number(floor);

                    if (floor && avaliableFloors.value.includes(floorNumber)) {
                        selectedFloor.value = floorNumber;
                    } else {
                        selectedFloor.value = avaliableFloors.value[0] === 0 ? avaliableFloors.value[1] : avaliableFloors.value[0];
                    }
                } else {
                    console.warn('у корпуса нет этажей');
                    selectedFloor.value = null;
                }

                updateUrlParams();
                await fetchBuildingCoordinates(selectedBuilding.value, selectedFloor.value);
                filterClassrooms();
                floorDataLoaded.value = true;
                centerMap();
            }
        };

        const onFloorChange = async () => {
            floorDataLoaded.value = false;
            updateUrlParams();
            await fetchBuildingCoordinates(selectedBuilding.value, selectedFloor.value);
            filterClassrooms();
            floorDataLoaded.value = true;
            centerMap();
        };

        const fetchBuildingCoordinates = async (buildingId, floor) => {
            try {
                const res = await axios.get(`/buildingcoordinates/buildingId/${buildingId}/floor/${floor}`);
                const buildingData = res.data ? JSON.parse(res.data) : null;

                if (buildingData && Array.isArray(buildingData.points)) {
                    buildings.value = buildings.value.map((building) => {
                        if (building.buildingId === buildingId) {
                            return {
                                ...building,
                                points: buildingData.points
                            };
                        }
                        return building;
                    });
                    filteredBuildings.value = buildings.value.filter(building => building.buildingId === selectedBuilding.value);
                    return true;
                } else {
                    console.warn("Неверные данные для координат корпуса:", buildingData);
                    return false;
                }
            } catch (error) {
                console.error('что-то создает ошибки загрузки координат корпусов: ', error);
                return false;
            }
        };

        const fetchClassrooms = async (buildingId) => {
            try {
                const res = await axios.get(`rooms/buildingId/${buildingId}`);
                classrooms.value = res.data.map((el, index) => {
                    const coords = el.Coordinates
                        ? JSON.parse(
                            el.Coordinates[0] === '"'
                                ? el.Coordinates.slice(1, -1)
                                : el.Coordinates
                        ).points
                        : null;
                    return {
                        id: el.Id,
                        name: el.Name,
                        floor: el.Floor,
                        number: el.Number + "/" + selectedBuildingShortName.value,
                        type: el.RoomType,
                        points: coords,
                        buildingId
                    }
                });
                classrooms.value = classrooms.value.filter(
                    (classroom) => Array.isArray(classroom.points) && classroom.points.length > 0
                );
                extractFloors();
            } catch (error) {
                console.error('что-то создает ошибки загрузки аудиторий: ', error);
            }
        }

        // получение этажей выбранного корпуса
        const extractFloors = () => {
            if (selectedBuilding.value) {
                const floorsSet = new Set(
                    classrooms.value
                        .filter(room => room.buildingId === selectedBuilding.value)
                        .map(room => room.floor)
                );
                avaliableFloors.value = Array.from(floorsSet)
                    .filter(floor => floor !== undefined && floor !== null)
                    .sort((a, b) => a - b);
            }
        };

        // фильтрация аудиторий по выбранному этажу
        const filterClassrooms = () => {
            if (selectedBuilding.value && selectedFloor.value !== null) {
                filteredClassrooms.value = classrooms.value.filter(room =>
                    room.buildingId === selectedBuilding.value && room.floor === selectedFloor.value
                );
            } else {
                filteredClassrooms.value = [];
            }
        };

        // размер карты в зависимости от размера окна сайта (нужны правки, но за допуск точно не вылезает)
        const updateComputedSize = () => {
            const headerOffset = 16;
            const containerPadding = 2;
            const avaliableHeight = window.innerHeight - headerOffset - containerPadding;
            computedWidth.value = Math.min(1700, window.innerWidth - containerPadding - headerOffset);
            computedHeight.value = avaliableHeight > 400 ? avaliableHeight : 400;
        };

        const updateUrlParams = () => {
            const query = {
                korpus: selectedBuilding.value,
                floor: selectedFloor.value
            };
            router.replace({ query });
        };

        watch(floorDataLoaded, (newValue) => {
            if (newValue) {
                centerMap();
            }
        });

        // что будет после монтирования компонента
        onMounted(async () => {
            updateComputedSize();
            window.addEventListener('resize', updateComputedSize);

            await fetchBuildings();

            const { korpus, floor } = router.currentRoute.value.query;

            if (korpus) {
                selectedBuilding.value = korpus;
                await onBuildingChange();
                if (floor && selectedFloor.value !== Number(floor)) {
                    selectedFloor.value = Number(floor);
                    await onFloorChange();
                }
            }
        });

        // что будет прямо перед монтированием компонента
        onBeforeUnmount(() => {
            window.removeEventListener('resize', updateComputedSize);
        });

        return {
            // переменные
            scale,
            computedWidth,
            computedHeight,
            selectedBuilding,
            avaliableFloors,
            selectedFloor,
            panX,
            panY,
            buildings,
            classrooms,
            filteredBuildings,
            filteredClassrooms,

            floorDataLoaded,

            isModalOpen,
            scheduleData,
            selectedClassroomName,
            selectedClassroomNumber,
            selectedClassroomType,

            // методы
            handleClassroomClick,
            handleZoom,
            startPan,
            panMap,
            endPan,
            getFillColor,

            fetchSchedule,
            closeModal,

            centerMap,

            onBuildingChange,
            onFloorChange,

            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,
        };
    },
};
</script>

<style scoped>
.floor-map__container {
    border: 1px solid #ddd;
    position: relative;
    overflow: hidden;
    touch-action: none;
    display: flex;
    flex-direction: column;
}

.floor-map__svg {
    flex: 1;
    height: 100%;
}

.floor-map__overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 20;
}

.floor-map__modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    z-index: 30;
    max-width: 1024px;
    width: 90%;
    box-sizing: border-box;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;
}

@media (max-width: 650px) {
    .floor-map__modal {
        top: 10%;
        left: 50%;
        transform: translate(-50%, 0);
        width: 90%;
        padding: 15px;
        max-height: 90vh;
    }
}

.floor-map__controls {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 20;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 8px 12px;
    border-radius: 8px;
}

.floor-map__select {
    padding: 5px;
    font-size: 14px;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    color: #333;
    cursor: pointer;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    max-width: 120px;
}

.floor-map__select:hover {
    background-color: #e6f7ff;
    border-color: #66afe9;
}

.floor-map__select:focus {
    outline: none;
    background-color: #f5fcff;
    border-color: #66afe9;
}

.floor-map__schedule-item {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background-color: #fcfeff;
    border: 1px solid #cbd2da;
    padding: 10px;
    margin: -1px;
}

.floor-map__schedule-time {
    flex: 1 1 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f5f5f5;
    color: #275886;
    font-weight: bold;
    margin-right: 10px;
    padding: 5px;
}

.floor-map__schedule-details {
    flex: 3 1 300px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

.floor-map__schedule-type {
    flex: 0 1 200px;
    /* background-color: #276093; */
    color: #fff;
    padding: 5px 10px;
    margin-right: 10px;
    font-size: 14px;
    text-align: center;
}

.floor-map__schedule-subject {
    flex: 2 1 200px;
    font-size: 16px;
    color: #525252;
    margin-bottom: 5px;
    margin-right: 10px;
}

.floor-map__schedule-teacher {
    flex: 2 1 100px;
    font-size: 14px;
    color: #666767;
    margin-bottom: 5px;
}

.floor-map__schedule-groups {
    flex: 1 1 100px;
    font-size: 14px;
    color: #666767;
    text-align: center;
}

.floor-map__classroom--edu-lab .floor-map__classroom-polygon {
    fill: #ade7ad;
}

.floor-map__classroom--sci-lab .floor-map__classroom-polygon {
    fill: #abe9da;
}

.floor-map__classroom--admin .floor-map__classroom-polygon {
    fill: #e7e6ad;
}

.floor-map__classroom--ahch .floor-map__classroom-polygon {
    fill: #ebd9a9;
}

.floor-map__classroom--comp .floor-map__classroom-polygon {
    fill: #abb9e9;
}

.floor-map__schedule-item--practice .floor-map__schedule-type  {
    background-color: #fe8d01;
}

.floor-map__schedule-item--lab .floor-map__schedule-type  {
    background-color: #3f8370;
}

.floor-map__schedule-item--lecture .floor-map__schedule-type  {
    background-color: #276192;
}

.floor-map__schedule-item--exam .floor-map__schedule-type  {
    background-color: #e91e63;
}

.floor-map__schedule-item--consult .floor-map__schedule-type  {
    background-color: #9c5f9f;
}

.floor-map__schedule-item--project .floor-map__schedule-type  {
    background-color: #3f7ab2;
}

.floor-map__schedule-item--default .floor-map__schedule-type  {
    background-color: #3f79b1;
}
</style>
