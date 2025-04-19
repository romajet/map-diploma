<!-- src/components/FloorMap.vue -->
<template>
    <div class="floor-map">
        <div class="floor-map__controls">
            <!-- возврат к списку корпусов -->
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
                    <div v-for="(entry, index) in scheduleData" :key="index"
                        :class="['floor-map__schedule-item', getScheduleClass(entry.type)]">
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
                ref="svgRef"
                :width="'100%'"
                :height="'100%'"
                @wheel="handleZoom"
                @mousedown="startPan"
                @mousemove="panMap"
                @mouseup="endPan"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
                class="floor-map__svg"
            >
                <!-- группа для масштабирования и параномирования -->
                <g :transform="'translate(' + panX + ', ' + panY + ') scale(' + scale + ')'"
                    class="floor-map__svg-content">
                    <!-- отрисовка заполнения корпуса -->
                    <g v-for="(building, index) in filteredBuildings" :key="index" class="floor-map__building">
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
                            :fill="'lightblue'"
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
                            class="floor-map__classroom-number">
                            {{ classroom.number }}
                        </text>
                    </g>
                    <!-- отрисовка граней корпуса -->
                    <g v-for="(building, index) in filteredBuildings" :key="index" class="floor-map__building">
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue"
import axios from "../axios"
import router from '@/router'
import polylabel from "polylabel"
import { IconHome, IconFrame } from "@tabler/icons-vue"

export default {
    name: "FloorMap",
    components: {
        IconFrame,
        IconHome
    },
    data() {
        return {
            svgRef: null,

            scale: 1,
            panX: 0,
            panY: 0,
            startX: 0,
            startY: 0,
            isPanning: false,
            minScale: 0.2,
            maxScale: 5,

            buildings: [],
            classrooms: [],
            filteredBuildings: [],
            filteredClassrooms: [],

            selectedBuilding: null,
            selectedClassroomShortName: "",
            selectedFloor: null,
            avaliableFloors: [],
            floorDataLoaded: false,

            isModalOpen: false,
            selectedClassroomName: "",
            selectedClassroomNumber: "",
            selectedClassroomType: "",
            scheduleData: [],

            touchStartX: 0,
            touchStartY: 0,
            isDragging: false,
            dragThreshold: 5,
            initialTouchDistance: null,
            initialScale: 1,
        }
    },
    watch: {
        floorDataLoaded(newValue) {
            if (newValue) {
                this.centerMap()
            }
        },
    },
    mounted() {
        this.$nextTick(() => {
            if (this.$refs.svgRef) {
                this.svgRef = this.$refs.svgRef
                this.svgRef.addEventListener("touchstart", this.handleTouchStart, { passive: false })
                this.svgRef.addEventListener("touchmove", this.handleTouchMove, { passive: false })
                this.svgRef.addEventListener("touchend", this.handleTouchEnd, { passive: false })
            }
        })

        // Сначала загружаем список зданий
        this.fetchBuildings().then(() => {
            // После загрузки зданий проверяем URL-параметры
            const { korpus, floor } = router.currentRoute.value.query

            if (korpus) {
                // Проверяем, существует ли такой корпус в списке
                const buildingExists = this.buildings.some(building => building.buildingId === korpus)

                if (buildingExists) {
                    this.selectedBuilding = korpus
                    this.onBuildingChange().then(() => {
                        if (floor && this.selectedFloor !== Number(floor)) {
                            this.selectedFloor = Number(floor)
                            this.onFloorChange()
                        }
                    })
                }
            }
        })
    },
    beforeDestroy() {
        if (this.svgRef) {
            this.svgRef.removeEventListener("touchstart", this.handleTouchStart)
            this.svgRef.removeEventListener("touchmove", this.handleTouchMove)
            this.svgRef.removeEventListener("touchend", this.handleTouchEnd)
        }
    },
    methods: {
        // классы для аудиторий
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

        // классы для расписания
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
                    if (
                        point &&
                        typeof point.x === 'number' &&
                        typeof point.y === 'number' &&
                        !isNaN(point.x) &&
                        !isNaN(point.y)
                    ) {
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
        },

        // масштабирование относительно мыши
        handleZoom(event) {
            event.preventDefault()
            const scaleBy = 1.1

            const direction = event.deltaY > 0 ? -1 : 1
            const oldScale = this.scale;
            const newScale = Math.max(
                this.minScale,
                Math.min(oldScale * (direction > 0 ? scaleBy : 1 / scaleBy), this.maxScale)
            );

            const rect = event.currentTarget.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left - this.panX) / oldScale;
            const mouseY = (event.clientY - rect.top - this.panY) / oldScale;

            this.panX -= (mouseX * newScale - mouseX * oldScale);
            this.panY -= (mouseY * newScale - mouseY * oldScale);

            this.scale = newScale;
        },

        // Начало панорамирования
        startPan(event) {
            this.isPanning = true
            this.isDragging = false // Сбрасываем флаг перемещения
            this.startX = event.clientX - this.panX
            this.startY = event.clientY - this.panY
        },

        // Панорамирование карты
        panMap(event) {
            if (this.isPanning) {
                const deltaX = Math.abs(event.clientX - this.startX)
                const deltaY = Math.abs(event.clientY - this.startY)

                // устанавливаем флаг, если перемещение превышает порог
                if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
                    this.isDragging = true
                }

                this.panX = event.clientX - this.startX
                this.panY = event.clientY - this.startY
            }
        },

        // Завершение панорамирования
        endPan() {
            this.isPanning = false
        },

        // Обработка клика и касания по аудитории
        handleClassroomClick(classroom) {
            if (!this.isDragging) {
                this.fetchSchedule(classroom)
            } else {
                console.log("Перемещение карты, нажатие на аудиторию отменено")
            }
        },

        // Начало взаимодействия с сенсорным экраном
        handleTouchStart(event) {
            if (event.touches.length === 2) {
                event.preventDefault()

                // Если два пальца касаются экрана, начинаем жест масштабирования
                const touch1 = event.touches[0]
                const touch2 = event.touches[1]
                this.initialTouchDistance = this.getDistanceBetweenTouches(touch1, touch2)
                this.initialScale = this.scale
            } else if (event.touches.length === 1) {
                // Если один палец касается экрана, начинаем перетаскивание
                this.isPanning = true
                this.startX = event.touches[0].clientX - this.panX
                this.startY = event.touches[0].clientY - this.panY

                this.touchStartX = event.touches[0].clientX
                this.touchStartY = event.touches[0].clientY
            }
        },

        // Обработка движения касания
        handleTouchMove(event) {
            if (event.touches.length === 2 && this.initialTouchDistance != null) {
                event.preventDefault()

                // Жест масштабирования двумя пальцами
                const touch1 = event.touches[0]
                const touch2 = event.touches[1]
                const currentDistance = this.getDistanceBetweenTouches(touch1, touch2)
                const scaleFactor = currentDistance / this.initialTouchDistance
                const newScale = Math.max(this.minScale, Math.min(this.initialScale * scaleFactor, this.maxScale))

                // Центрирование масштабирования
                const rect = event.currentTarget.getBoundingClientRect()
                const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left - this.panX
                const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top - this.panY

                this.panX -= (centerX / this.scale) * (newScale - this.scale)
                this.panY -= (centerY / this.scale) * (newScale - this.scale)

                this.scale = newScale
            } else if (event.touches.length === 1 && this.isPanning) {
                // Перетаскивание одним пальцем
                const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX)
                const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY)

                if (deltaX > this.dragThreshold || deltaY > this.dragThreshold) {
                    event.preventDefault()
                    this.isDragging = true

                    this.panX = event.touches[0].clientX - this.startX
                    this.panY = event.touches[0].clientY - this.startY
                }
            }
        },

        // Завершение сенсорного взаимодействия
        handleTouchEnd() {
            this.initialTouchDistance = null
            this.isPanning = false

            setTimeout(() => {
                this.isDragging = false
            }, 10)
        },

        // Вспомогательная функция для вычисления расстояния между двумя касаниями
        getDistanceBetweenTouches(touch1, touch2) {
            const dx = touch2.clientX - touch1.clientX
            const dy = touch2.clientY - touch1.clientY
            return Math.sqrt(dx * dx + dy * dy)
        },

        // Центрирование корпуса
        centerMap() {
            let targetPoints = []

            if (this.filteredBuildings[0]?.points?.length) {
                targetPoints = this.filteredBuildings[0].points
            } else if (this.filteredClassrooms.length) {
                targetPoints = this.filteredClassrooms.flatMap((classroom) => classroom.points)
            }

            if (targetPoints.length) {
                const xCoords = targetPoints.map((p) => p.x)
                const yCoords = targetPoints.map((p) => p.y)

                const minX = Math.min(...xCoords)
                const maxX = Math.max(...xCoords)
                const minY = Math.min(...yCoords)
                const maxY = Math.max(...yCoords)

                const centerX = (minX + maxX) / 2
                const centerY = (minY + maxY) / 2

                const width = maxX - minX
                const height = maxY - minY

                const { width: containerWidth, height: containerHeight } = this.svgRef.getBoundingClientRect()

                const scaleX = containerWidth / (width + 20)
                const scaleY = containerHeight / (height + 20)
                const optimalScale = Math.min(scaleX, scaleY, this.maxScale)

                this.scale = optimalScale
                this.panX = containerWidth / 2 - centerX * this.scale
                this.panY = containerHeight / 2 - centerY * this.scale
            } else {
                console.warn("нет данных для центрирования")
            }
        },

        // Получение расписания
        fetchSchedule(classroom) {
            this.selectedClassroomName = classroom.name
            this.selectedClassroomNumber = classroom.number
            this.selectedClassroomType = classroom.type
            console.log(this.selectedClassroomType)
            this.isModalOpen = true

            axios
                .get(`/schedule/roomId/${classroom.id}`)
                .then((res) => {
                    this.scheduleData = res.data.map((el) => {
                        const [startTime, endTime] = el.Period.split("-")
                        let Type = "-"
                        console.log(el.Type)
                        switch (el.Type) {
                            case "лек.":
                                Type = "Лекции"
                                break
                            case "лаб.":
                                Type = "Лабораторные занятия"
                                break
                            case "практ.зан.  и семин.":
                                Type = "Практические занятия и семинары"
                                break
                        }
                        return {
                            groups: el.Groups,
                            id: el.Id,
                            start_time: startTime.trim().slice(0, 5),
                            end_time: endTime.trim().slice(0, 5),
                            subject: el.Subject,
                            teacher: el.Teacher,
                            type: Type,
                        }
                    })
                    this.scheduleData.sort((a, b) => {
                        const timeA = new Date(`1970-01-01T${a.start_time}:00`).getTime()
                        const timeB = new Date(`1970-01-01T${b.start_time}:00`).getTime()
                        return timeA - timeB
                    })
                })
                .catch((error) => {
                    console.error("что-то создает ошибки при загрузке расписания:", error)
                    this.scheduleData = []
                })
        },

        // Закрытие модального окна
        closeModal() {
            this.isModalOpen = false
            this.scheduleData = []
        },

        async fetchBuildings() {
            try {
                const res = await axios.get("/buildings")
                this.buildings = res.data.map((el) => ({
                    buildingId: el.Id,
                    name: el.Name,
                    shortname: el.ShortName,
                }))

                // Сохраняем текущий выбранный корпус
                const currentSelectedBuilding = this.selectedBuilding

                // Устанавливаем selectedBuilding только если он еще не установлен
                if (!currentSelectedBuilding) {
                    this.selectedBuilding = this.buildings[0].buildingId
                    this.selectedBuildingShortName = this.buildings[0].shortname
                } else {
                    // Если корпус уже выбран, обновляем только shortname
                    const selectedBuildingInfo = this.buildings.find(
                        (building) => building.buildingId === currentSelectedBuilding
                    )
                    if (selectedBuildingInfo) {
                        this.selectedBuildingShortName = selectedBuildingInfo.shortname
                    }
                }

                this.onBuildingChange()
            } catch (error) {
                console.error("что-то создает ошибки загрузки корпусов: ", error)
            }
        },

        // Обработка изменения корпуса
        async onBuildingChange() {
            if (this.selectedBuilding) {
                this.floorDataLoaded = false

                this.classrooms = []
                this.filteredClassrooms = []
                this.avaliableFloors = []
                this.filteredBuildings = []

                const selectedBuildingInfo = this.buildings.find((building) => building.buildingId === this.selectedBuilding)
                // console.log(selectedBuildingInfo)
                this.selectedBuildingShortName = selectedBuildingInfo.shortname
                // console.log(this.selectedClassroomShortName)

                await this.fetchClassrooms(this.selectedBuilding)

                if (this.avaliableFloors.length > 0) {
                    const { floor } = router.currentRoute.value.query
                    const floorNumber = Number(floor)

                    if (floor && this.avaliableFloors.includes(floorNumber)) {
                        this.selectedFloor = floorNumber
                    } else {
                        this.selectedFloor = this.avaliableFloors[0] === 0 ? this.avaliableFloors[1] : this.avaliableFloors[0]
                    }
                } else {
                    console.warn("у корпуса нет этажей")
                    this.selectedFloor = null
                }

                this.updateUrlParams()
                await this.fetchBuildingCoordinates(this.selectedBuilding, this.selectedFloor)
                this.filterClassrooms()
                this.floorDataLoaded = true
                this.centerMap()
            }
        },

        // Обработка изменения этажа
        async onFloorChange() {
            this.floorDataLoaded = false
            this.updateUrlParams()
            await this.fetchBuildingCoordinates(this.selectedBuilding, this.selectedFloor)
            this.filterClassrooms()
            this.floorDataLoaded = true
            this.centerMap()
        },

        // Загрузка координат корпуса
        async fetchBuildingCoordinates(buildingId, floor) {
            try {
                const res = await axios.get(`/buildingcoordinates/buildingId/${buildingId}/floor/${floor}`)
                const buildingData = res.data ? JSON.parse(res.data) : null

                if (buildingData && Array.isArray(buildingData.points)) {
                    this.buildings = this.buildings.map((building) => {
                        if (building.buildingId === buildingId) {
                            return {
                                ...building,
                                points: buildingData.points,
                            }
                        }
                        return building
                    })
                    this.filteredBuildings = this.buildings.filter((building) => building.buildingId === this.selectedBuilding)
                    return true
                } else {
                    console.warn("Неверные данные для координат корпуса:", buildingData)
                    return false
                }
            } catch (error) {
                console.error("что-то создает ошибки загрузки координат корпусов: ", error)
                return false
            }
        },

        // Загрузка аудиторий
        async fetchClassrooms(buildingId) {
            try {
                const res = await axios.get(`rooms/buildingId/${buildingId}`)
                this.classrooms = res.data.map((el) => {
                    const coords = el.Coordinates
                        ? JSON.parse(el.Coordinates[0] === '"' ? el.Coordinates.slice(1, -1) : el.Coordinates).points
                        : null
                    return {
                        id: el.Id,
                        name: el.Name,
                        floor: el.Floor,
                        number: el.Number + "/" + this.selectedBuildingShortName,
                        type: el.RoomType,
                        points: coords,
                        buildingId,
                    }
                })
                this.classrooms = this.classrooms.filter(
                    (classroom) => Array.isArray(classroom.points) && classroom.points.length > 0,
                )
                this.extractFloors()
            } catch (error) {
                console.error("что-то создает ошибки загрузки аудиторий: ", error)
            }
        },

        // Получение этажей выбранного корпуса
        extractFloors() {
            if (this.selectedBuilding) {
                const floorsSet = new Set(
                    this.classrooms.filter((room) => room.buildingId === this.selectedBuilding).map((room) => room.floor),
                )
                this.avaliableFloors = Array.from(floorsSet)
                    .filter((floor) => floor !== undefined && floor !== null)
                    .sort((a, b) => a - b)
            }
        },

        // Фильтрация аудиторий по выбранному этажу
        filterClassrooms() {
            if (this.selectedBuilding && this.selectedFloor !== null) {
                this.filteredClassrooms = this.classrooms.filter(
                    (room) => room.buildingId === this.selectedBuilding && room.floor === this.selectedFloor,
                )
            } else {
                this.filteredClassrooms = []
            }
        },

        // Обновление URL-параметров
        updateUrlParams() {
            const query = {
                korpus: this.selectedBuilding,
                floor: this.selectedFloor,
            }
            router.replace({ query })
        },
    },
};
</script>

<style scoped>
.floor-map {
    padding: 10px;
    box-sizing: border-box;
    height: 100vh;
    width: 100vw;
    max-width: 1700px;
    display: flex;
    flex-direction: column;
}

@media (min-width: 412px) {
    .floor-map {
        padding: 20px;
    }
}

.floor-map__container {
    border: 1px solid black;
    flex-grow: 1;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.floor-map__svg {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: pan-x pan-y;
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
    top: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 20;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 8px 12px;
    border-radius: 8px;
}

@media (max-width: 412px) {
    .floor-map__controls {
        top: 15px;
    }
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

.floor-map__schedule-item--practice .floor-map__schedule-type {
    background-color: #fe8d01;
}

.floor-map__schedule-item--lab .floor-map__schedule-type {
    background-color: #3f8370;
}

.floor-map__schedule-item--lecture .floor-map__schedule-type {
    background-color: #276192;
}

.floor-map__schedule-item--exam .floor-map__schedule-type {
    background-color: #e91e63;
}

.floor-map__schedule-item--consult .floor-map__schedule-type {
    background-color: #9c5f9f;
}

.floor-map__schedule-item--project .floor-map__schedule-type {
    background-color: #3f7ab2;
}

.floor-map__schedule-item--default .floor-map__schedule-type {
    background-color: #3f79b1;
}

.floor-map__button {
    padding: 2px 6px;
}
</style>
