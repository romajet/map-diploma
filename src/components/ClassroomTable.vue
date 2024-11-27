<!-- src/components/ClassroomTable.vue -->
<template>
    <div class="classroom-table">
        <h2>{{ buildingName }}</h2>
        <div class="filter">
            <label for="floor-select">Выберите этаж:</label>
            <select id="floor-select" v-model="selectedFloor" @change="updateFloorQuery">
                <option value="all">Все этажи</option>
                <option v-for="floor in floors" :key="floor" :value="floor">
                    {{ floor }}
                </option>
            </select>
        </div>
        <table v-if="filteredClassrooms.length" class="highlight">
            <thead>
                <tr>
                    <!-- <th>#</th> -->
                    <th>Номер</th>
                    <th>расп.</th>
                    <th>Идентификатор</th>
                    <th>Название аудитории</th>
                    <th>Этаж</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(classroom, index) in filteredClassrooms" :key="classroom.id">
                    <!-- <td>{{ index + 1 }}</td> -->
                    <td>{{ classroom.number }}</td>
                    <td @click="openModal(classroom)" style="color: white; text-align: center; user-select: none;">
                        кнопка</td>
                    <td>{{ classroom.id }}</td>
                    <td>{{ classroom.name }}</td>
                    <td>{{ classroom.floor }}</td>
                </tr>
            </tbody>
        </table>
        <p v-else>Нет аудиторий для отображения</p>

        <!-- затемнение фона -->
        <div v-if="isModalOpen" class="overlay" @click="closeModal"></div>
        <!-- расписание для аудитории -->
        <div v-if="isModalOpen" class="modal">
            <h3>{{ selectedClassroom.number }} - {{ selectedClassroom.name }}</h3>
            <table v-if="scheduleData.length" class="schedule-table">
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
            <p v-else>нет данных о расписании на сегодня</p>
            <button class="close-button" @click="closeModal">закрыть</button>
        </div>
    </div>
</template>

<script>
import axios from '../axios.js';

export default {
    name: 'ClassroomTable',
    props: {
        buildingId: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            classrooms: [],
            filteredClassrooms: [],
            floors: [],
            selectedFloor: 'all',
            buildingName: '',
            isModalOpen: false,
            selectedClassroom: {},
            scheduleData: []
        };
    },
    async created() {
        await Promise.all([this.fetchClassrooms(), this.fetchBuildingName()]);
        this.setInitialFloorFromQuery();
    },
    methods: {
        async fetchClassrooms() {
            try {
                axios.get(`/rooms/buildingId/${this.buildingId}`).then(res => {
                    this.classrooms = res.data.map((el) => ({
                        id: el.Id,
                        name: el.Name,
                        floor: el.Floor,
                        number: el.Number,
                    }));
                    this.filteredClassrooms = this.classrooms;
                    this.extractFloors();
                });
            } catch (error) {
                console.error('что-то создает ошибки при загрузке аудиторий:', error);
            }
        },
        async fetchBuildingName() {
            try {
                axios.get('/buildings').then(res => {
                    const buildingElements = res.data;
                    const building = buildingElements.find(el => el.Id === this.buildingId);
                    if (building) {
                        this.buildingName = building.Name;
                    } else {
                        console.warn('Корпус не найден');
                    }
                })
            } catch (error) {
                console.error('ошибка при получении названия корпуса: ', error);
            }
        },
        extractFloors() {
            const floorsSet = new Set(this.classrooms.map((room) => room.floor));
            this.floors = Array.from(floorsSet).sort((a, b) => a - b);
        },
        filterClassrooms() {
            if (this.selectedFloor === 'all') {
                this.filteredClassrooms = this.classrooms;
            } else {
                this.filteredClassrooms = this.classrooms.filter((room) => room.floor === this.selectedFloor);
            }
            this.filteredClassrooms.sort((a, b) => this.compareRoomNumbers(a.number, b.number));
        },
        compareRoomNumbers(num1, num2) {
            const parseRoomNumber = (number) => {
                const match = number.match(/^(\d+)([^\d]*)$/);
                return match ? [parseInt(match[1], 10), match[2]] : [Infinity, number];
            };

            const [numberA, suffixA] = parseRoomNumber(num1);
            const [numberB, suffixB] = parseRoomNumber(num2);

            if (numberA === numberB) {
                return suffixA.localeCompare(suffixB);
            }
            return numberA - numberB;
        },
        setInitialFloorFromQuery() {
            const floor = this.$route.query.floor;
            if (floor && this.floors.includes(floor)) {
                this.selectedFloor = floor;
            } else {
                this.selectedFloor = 'all';
            }
            this.filterClassrooms();
        },
        updateFloorQuery() {
            this.filterClassrooms();
            this.$router.replace({
                query: { ...this.$route.query, floor: this.selectedFloor },
            });
        },
        openModal(classroom) {
            this.selectedClassroom = classroom;
            this.isModalOpen = true;
            this.fetchSchedule(classroom.id);
        },
        closeModal() {
            this.isModalOpen = false;
            this.scheduleData = [];
        },
        fetchSchedule(classroomId) {
            axios.get(`/schedule/roomId/${classroomId}`).then(res => {
                // console.log(res.data);
                // scheduleData.value = res.data;
                this.scheduleData = res.data.map(el => {
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
                this.scheduleData.sort((a, b) => {
                    const timeA = new Date(`1970-01-01T${a.start_time}:00`).getTime();
                    const timeB = new Date(`1970-01-01T${b.start_time}:00`).getTime();
                    return timeA - timeB;
                })
            }).catch(error => {
                console.error('что-то создает ошибки при загрузке расписания:', error);
                scheduleData.value = [];
            });
        },
        typeOfColor(type) {
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
    },
    watch: {
        buildingId(newId, oldId) {
            if (newId !== oldId) {
                this.fetchClassrooms();
                this.fetchBuildingName();
                this.selectedFloor = 'all';
                this.filterClassrooms();
            }
        }
    }
};
</script>

<style scoped>
.classroom-table {
    margin-top: 20px;
}

.filter {
    margin-bottom: 10px;
}

table {
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

select {
    padding: 5px;
    margin-left: 10px;
}

.highlight tbody tr td:nth-child(2) {
    background-color: #cfcfcf;
    transition: background-color 0.3s ease;
}

.highlight tbody tr td:nth-child(2):hover {
    background-color: #7a9eaf;
    cursor: pointer;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10;
}

.modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    z-index: 20;
    max-height: 80%;
    overflow-y: auto;
}

.scheduleDetail {
    border-bottom: 1px solid #ddd;
    margin-bottom: 10px;
    padding-bottom: 10px;
}

.close-button {
    margin-top: 10px;
    padding: 8px 16px;
    background-color: #2c72a5;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 4px;
}
</style>