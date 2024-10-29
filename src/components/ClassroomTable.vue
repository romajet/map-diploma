<!-- src/components/ClassroomTable.vue -->
 <template>
    <div class="classroom-table">
        <h2>Аудитории корпуса {{ buildingName }}</h2>
        <div class="filter">
            <label for="floor-select">Выберите этаж:</label>
            <select id="floor-select" v-model="selectedFloor" @change="filterClassrooms">
                <option value="">Все этажи</option>
                <option v-for="floor in floors" :key="floor" :value="floor">
                    Этаж {{ floor }}
                </option>
            </select>
        </div>
        <table v-if="filteredClassrooms.length">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Название аудитории</th>
                    <th>Этаж</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(classroom, index) in filteredClassrooms" :key="classroom.id">
                    <td>{{ index + 1 }}</td>
                    <td>{{ classroom.name }}</td>
                    <td>{{ classroom.floor }}</td>
                </tr>
            </tbody>
        </table>
        <p v-else>Нет аудиторий для отображения</p>
    </div>
 </template>

<script>
import axios from '../axios.js';

export default {
    name: 'ClassroomTable',
    props: {
        buildingId: {
            type: Number,
            required: true
        }
    },
    data() {
        return {
            classrooms: [],
            filteredClassrooms: [],
            floors: [],
            selectedFloor: '',
            buildingName: ''
        };
    },
    created() {
        this.fetchClassrooms();
        this.fetchBuildingName();
    },
    methods: {
        async fetchClassrooms() {
            try {
                const response = await axios.get('/rooms/buildingId/${this.buildingId}');
                if (response.ArrayOfRoom && response.ArrayOfRoom.Room) {
                    this.classrooms = Array.isArray(response.ArrayOfRoom.Room)
                    ? response.ArrayOfRoom.Room
                    : [response.ArrayOfRoom.Room];
                    this.filteredClassrooms = this.classrooms;
                    this.extractFloors();
                } else {
                    console.warn('структура xml не соответствует ожиданиям');
                }
            } catch(error) {
                console.error('ошибка при загрузке аудиторий:', error);
                // уведомление для пользователя при необходимости
            }
        },
        extractFloors() {
            const floorsSet = new Set(this.classrooms.map(c => parseInt(c.floor, 10)));
            this.floors = Array.from(floorsSet).sort((a, b) => a - b);
        },
        filterClassrooms() {
            if (this.selectedFloor) {
                this.filteredClassrooms = this.classrooms.filter(c => parseInt(c.floor, 10) === parseInt(this.selectedFloor, 10));
            } else {
                this.filteredClassrooms = this.classrooms;
            }
        },
        async fetchBuildingName() {
            try {
                const response = await axios.get('/buildings');
                if (response.ArrayOfBuilding && response.ArrayOfBuilding.Building) {
                    const buildings = Array.isArray(response.ArrayOfBuilding.Building)
                    ? response.ArrayOfBuilding.Building
                    : [response.ArrayOfBuilding.Building];
                    const building = buildings.find(b => parseInt(b.Id, 10) === this.buildingId);
                    this.buildingName = building ? building.name : 'неизвестный корпус';
                } else {
                    this.buildingName = 'неизвестный корпус';
                    console.warn('структура xml не соответствует ожиданиям при получении названия корпуса');
                }
            } catch(error) {
                console.error('ошибка при получении названия корпуса: ', error);
                // уведомление для пользователя
            }
        }
    },
    watch: {
        buildingId(newId, oldId) {
            if (newId !== oldId) {
                this.fetchClassrooms();
                this.fetchBuildingName();
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

th, id {
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
</style>