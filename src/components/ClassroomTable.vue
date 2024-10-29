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
                const response = await axios.get('/rooms/buildingId/${this.buildingId}', {
                    responseType: 'text'
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'application/xml');
                const roomElements = xmlDoc.getElementsByTagName('Room');

                this.classrooms = Array.from(roomElements).map((el) => ({
                    id: el.getElementsByTagName('Id')[0].textContent,
                    name: el.getElementsByTagName('Name')[0].textContent,
                    floor: el.getElementsByTagName('Floor')[0].textContent,
                }));

                this.filteredClassrooms = this.classrooms;
                this.extractFloors();
            } catch(error) {
                console.error('ошибка при загрузке аудиторий:', error);
                // уведомление для пользователя при необходимости
            }
        },
        extractFloors() {
            const floorsSet = new Set(this.classrooms.map((room) => room.floor));
            this.floors = Array.from(floorsSet).sort((a, b) => a - b);
        },
        filterClassrooms() {
            if (this.selectedFloor) {
                this.filteredClassrooms = this.classrooms.filter((room) => room.floor === this.selectedFloor);
            } else {
                this.filteredClassrooms = this.classrooms;
            }
        },
        async fetchBuildingName() {
            try {
                const response = await axios.get('/buildings', {
                    responseType: 'text'
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'application/xml');
                const buildingElements = xmlDoc.getElementsByTagName('Building');

                const building = Array.from(buildingElements).find(
                    (el) => el.getElementsByTagName('Id')[0].textContent === this.buildingId
                );

                if (building) {
                    this.buildingName = building.getElementsByTagName('Name')[0].textContent;
                } else {
                    console.warn('Корпус не найден.');
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