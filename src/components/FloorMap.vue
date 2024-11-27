<!-- src/components/FloorMap.vue -->
<template>
    <div class="controls">
        <!-- селектор корпуса -->
        <select v-model="selectedBuilding" @change="onBuildingChange" class="styled-select building-select">
            <option v-for="building in buildings" :key="building.buildingId" :value="building.buildingId">
                {{ building.shortname }} - {{ building.name }}
            </option>
        </select>
        <!-- селектор этажа если выбран корпус -->
        <select v-model="selectedFloor" @change="onFloorChange" class="styled-select floor-select">
            <option v-for="floor in avaliableFloors" :key="floor" :value="floor">
                Этаж {{ floor }}
            </option>
        </select>
    </div>
    <div class="map-container">
        <!-- затемнение фона -->
        <div v-if="isModalOpen" class="overlay" @click="closeModal"></div>
        <!-- расписание для аудитории -->
        <div v-if="isModalOpen" class="modal">
            <h3>{{ selectedClassroomNumber }} - {{ selectedClassroomName }}</h3>
            <div v-if="scheduleData.length" class="scheduleContainer">
                <div v-for="(entry, index) in scheduleData" :key="index" class="scheduleDetail">
                    <div class="time">
                        <span class="start-time">{{ entry.start_time }}</span>
                        <span class="end-time">{{ entry.end_time }}</span>
                    </div>
                    <div class="details">
                        <div class="type" :style="{ backgroundColor: typeOfColor(entry.type) }">{{ entry.type }}</div>
                        <div class="subject">{{ entry.subject }}</div>
                        <div class="teacher">{{ entry.teacher }}</div>
                        <div class="groups">{{ entry.groups }}</div>
                    </div>
                </div>
            </div>
            <p v-else>нет данных о расписании</p>
            <table v-if="scheduleData.length">
                <thead>
                    <tr>
                        <th>группы</th>
                        <th>время</th>
                        <th>предмет</th>
                        <th>преподаватель</th>
                        <th>тип</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(entry, index) in scheduleData" :key="index">
                        <td>{{ entry.groups }}</td>
                        <td>{{ entry.start_time }} - {{ entry.end_time }}</td>
                        <td>{{ entry.subject }}</td>
                        <td>{{ entry.teacher }}</td>
                        <td>{{ entry.type }}</td>
                    </tr>
                </tbody>
            </table>
            <!-- <p v-else>нет данных о расписании на сегодня</p> -->
            <button class="close-button" @click="closeModal">закрыть</button>
        </div>

        <!-- контейнер для svg -->
        <svg :width="computedWidth" :height="computedHeight" @wheel="handleZoom" @mousedown="startPan"
            @mousemove="panMap" @mouseup="endPan" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
            @touchend="handleTouchEnd">
            <!-- группа для масштабирования и панорамирования -->
            <g :transform="'translate(' + panX + ', ' + panY + ') scale(' + scale + ')'">
                <!-- отрисовка корпуса -->
                <g v-for="(building, index) in filteredBuildings" :key="index">
                    <polygon :points="formatPoints(building.points)" :fill="building.fill || 'gray'" stroke="black"
                        stroke-width="2" />
                </g>

                <!-- отрисовка аудиторий -->
                <g v-for="(classroom, index) in filteredClassrooms" :key="'classroom' + index">
                    <polygon :points="formatPoints(classroom.points)" :fill="getFillColor(classroom.name)" stroke="blue"
                        stroke-width="1" />
                    <!-- текст по центру аудитории -->
                    <text :x="calculateTextX(classroom)" :y="calculateTextY(classroom)" text-anchor="middle"
                        alignment-baseline="middle" font-size="14" font-family="Arial" fill="black">
                        {{ classroom.number }}
                    </text>
                    <polygon :points="formatPoints(classroom.points)" :fill-opacity="0" stroke-opacity="0"
                        stroke-width="1" @click="handleClassroomClick(classroom)" />
                </g>
            </g>
        </svg>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";
import axios from "../axios";

export default {
    name: "FloorMap",
    props: {
        stageWidth: { type: Number, default: 800 },
        stageHeight: { type: Number, default: 600 },
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
        const scheduleData = ref([]);

        const selectedBuilding = ref(null);
        const selectedBuildingShortName = ref(null);
        const selectedFloor = ref(null);
        const avaliableFloors = ref([]);

        let isDragging = false;
        let dragThreshold = 5; // порог перемещения в пикселях для отмены нажатия

        let initialTouchDistance = null;
        let initialScale = 1;

        const typeOfColor = (type) => {
            if (type.includes('Практические')) {
                return '#ff8f00';
            }
            if (type.includes('Лабораторные')) {
                return '#3e8470';
            }
            if (type.includes('Лекции')) {
                return '#276093';
            }
            return '#3f79b1';
        }

        // Форматирование точек для SVG-полигона
        const formatPoints = (points) => {
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
        };

        // Центр текста для размещения в аудитории
        const calculateTextX = (classroom) => {
            if (!classroom.points || classroom.points.length === 0) {
                console.warn("Неверные данные для classroom.points:", classroom.points);
                return 0;
            }
            const xCoords = classroom.points.map((p) => p.x);
            return (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
        };

        const calculateTextY = (classroom) => {
            if (!classroom.points || classroom.points.length === 0) {
                console.warn("Неверные данные для classroom.points:", classroom.points);
                return 0;
            }
            const yCoords = classroom.points.map((p) => p.y);
            return (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
        };

        // Масштабирование относительно мыши
        const handleZoom = (event) => {
            event.preventDefault();
            const scaleBy = 1.1;

            const direction = event.deltaY > 0 ? -1 : 1;
            const oldScale = scale.value;
            const newScale = Math.max(0.5, Math.min(oldScale * (direction > 0 ? scaleBy : 1 / scaleBy), 3));

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
                const newScale = Math.max(0.5, Math.min(initialScale * scaleFactor, 3));

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

        const fetchSchedule = (classroom) => {
            selectedClassroomName.value = classroom.name;
            selectedClassroomNumber.value = classroom.number;
            isModalOpen.value = true;

            axios.get(`/schedule/roomId/${classroom.id}`).then(res => {
                // console.log(res.data);
                // scheduleData.value = res.data;
                scheduleData.value = res.data.map(el => {
                    const [startTime, endTime] = el.Period.split('-');
                    let Type = '-';
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

        // получение данных из АПИ
        const fetchBuildings = () => {
            axios.get('/buildings').then(res => {
                buildings.value = res.data.
                    map((el) => ({
                        buildingId: el.Id,
                        name: el.Name,
                        shortname: el.ShortName,
                    }));
                if (buildings.value.length > 0) {
                    // пока вбиты данные восточного крыла, так как только они готовы
                    // selectedBuilding.value = buildings.value[0].buildingId;
                    // selectedBuildingShortName.value = buildings.value[0].shortname;
                    selectedBuilding.value = "bce65150-c95a-40cb-a59e-9774f5e1b249";
                    selectedBuildingShortName.value = "1";
                    onBuildingChange();
                }
            }).catch(error => {
                console.error('что-то создает ошибки загрузки корпусов: ', error);
            });
        };

        const onBuildingChange = async () => {
            if (selectedBuilding.value) {
                classrooms.value = [];
                filteredClassrooms.value = [];
                avaliableFloors.value = [];
                await fetchBuildingCoordinates(selectedBuilding.value);
                await fetchClassrooms(selectedBuilding.value);
                if (avaliableFloors.value.length > 0) {
                    selectedFloor.value = selectedFloor.value || avaliableFloors.value[0];
                } else {
                    selectedFloor.value = null;
                }
                filterClassrooms();
            }
        };

        const fetchBuildingCoordinates = (buildingId) => {
            axios.get(`/buildingcoordinates/buildingId/${buildingId}/floor/1`).then(res => {
                const buildingData = res.data ? JSON.parse(res.data) : null;
                if (buildingData && Array.isArray(buildingData.points)) {
                    buildings.value = buildings.value.map(building => {
                        if (building.buildingId === buildingId) {
                            return {
                                ...building,
                                points: buildingData.points,
                            };
                        }
                        return building;
                    });
                    filteredBuildings.value = buildings.value.filter(building => building.buildingId === selectedBuilding.value);
                } else {
                    console.warn("Неверные данные для координат корпуса:", buildingData);
                }
            }).catch(error => {
                console.error('что-то создает ошибки загрузки координат корпусов: ', error);
            });
        };

        const fetchClassrooms = (buildingId) => {
            axios.get(`rooms/buildingId/${buildingId}`).then(res => {
                classrooms.value = res.data.map(el => ({
                    id: el.Id,
                    name: el.Name,
                    floor: el.Floor,
                    number: el.Number + "/" + selectedBuildingShortName.value,
                    points: el.Coordinates
                        ? JSON.parse(el.Coordinates.slice(1, -1)).points
                        : [],
                    buildingId
                }));
                classrooms.value = classrooms.value.filter(classroom => Array.isArray(classroom.points) && classroom.points.length > 0);
                filteredClassrooms.value = classrooms.value;
                extractFloors();
            }).catch(error => {
                console.error('что-то создает ошибки загрузки аудиторий: ', error);
            });
        };

        // получение этажей выбранного корпуса
        const extractFloors = () => {
            if (selectedBuilding.value) {
                const floorsSet = new Set(
                    classrooms.value
                        .filter(room => room.buildingId === selectedBuilding.value)
                        .map(room => room.floor)
                );
                avaliableFloors.value = Array.from(floorsSet).sort((a, b) => a - b);
            }
        };

        // фильтрация аудиторий по выбранному этажу
        const filterClassrooms = () => {
            if (selectedBuilding.value && selectedFloor.value) {
                filteredClassrooms.value = classrooms.value.filter(room =>
                    room.buildingId === selectedBuilding.value && room.floor === selectedFloor.value
                );
            } else {
                filteredClassrooms.value = [];
            }
        };

        // размер карты в зависимости от размера окна сайта (нужны правки, но за допуск точно не вылезает)
        const updateComputedSize = () => {
            const avaliableHeight = window.innerHeight - 79;
            computedWidth.value = Math.min(1700 - 12, window.innerWidth - 56);
            computedHeight.value = avaliableHeight > 400 ? avaliableHeight : 400;
        };

        // что будет после монтирования компонента
        onMounted(() => {
            updateComputedSize();
            window.addEventListener('resize', updateComputedSize);
            fetchBuildings();
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

            isModalOpen,
            scheduleData,
            selectedClassroomName,
            selectedClassroomNumber,

            // методы
            formatPoints,
            calculateTextX,
            calculateTextY,
            handleClassroomClick,
            handleZoom,
            startPan,
            panMap,
            endPan,
            getFillColor,

            fetchSchedule,
            closeModal,

            handleTouchStart,
            handleTouchMove,
            handleTouchEnd,

            typeOfColor,
        };
    },
};
</script>

<style scoped>
.map-container {
    border: 1px solid #ddd;
    position: relative;
    overflow: hidden;
    touch-action: none;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 20;
}

.modal {
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
    .modal {
        top: 10%;
        left: 50%;
        transform: translate(-50%, 0);
        width: 90%;
        padding: 15px;
        max-height: 90vh;
    }
}

.close-button {
    display: block;
    margin-top: 10px;
    padding: 8px 16px;
    background-color: #2c72a5;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 4px;
}

.controls {
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

.styled-select {
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

.styled-select:hover {
    background-color: #e6f7ff;
    border-color: #66afe9;
}

.styled-select:focus {
    outline: none;
    background-color: #f5fcff;
    border-color: #66afe9;
}

.styled-select option {
    text-overflow: ellipsis;
}

table {
    margin-top: 20px;
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    border: 1px solid #ddd;
    padding: 8px;
}

th {
    background-color: #f2f2f2;
    text-align: left;
}

.scheduleDetail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    background-color: #fcfeff;
    border: 1px solid #cbd2da;
    padding: 10px;
    margin: -1px;
}

.time {
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

.details {
    flex: 3 1 300px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
}

.type {
    flex: 0 1 200px;
    background-color: #276093;
    color: #fff;
    padding: 5px 10px;
    margin-right: 10px;
    font-size: 14px;
    text-align: center;
}

.subject {
    flex: 2 1 200px;
    font-size: 16px;
    color: #525252;
    margin-bottom: 5px;
    margin-right: 10px;
}

.teacher {
    flex: 2 1 100px;
    font-size: 14px;
    color: #666767;
    margin-bottom: 5px;
}

.groups {
    flex: 1 1 100px;
    font-size: 14px;
    color: #666767;
    text-align: center;
}
</style>