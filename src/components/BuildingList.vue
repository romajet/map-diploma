<!-- src/components/BuildingList.vue -->
<template>
    <div class="building-list">
        <button v-for="building in filteredBuildings" :key="building.id" @click="selectBuilding(building.id)"
            class="building-button">
            {{ building.name }} ({{ building.short_name }})
        </button>
    </div>
</template>

<script>
import axios from '../axios.js';

export default {
    name: 'buildingList',
    data() {
        return {
            buildings: []
        };
    },
    async created() {
        await this.fetchBuildings();
    },
    computed: {
        filteredBuildings() {
            return this.buildings.filter(building =>
                (building.name.includes('ентральн') || building.name.includes('Учебный к')) &&
                !building.name.includes('4') &&
                !building.name.includes('5') &&
                !building.name.includes('6')
            );
        },
    },
    methods: {
        async fetchBuildings() {
            try {
                const response = await axios.get('/buildings', {
                    responseType: 'text'
                });

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(response.data, 'application/xml');
                const buildingElements = xmlDoc.getElementsByTagName('Building');

                this.buildings = Array.from(buildingElements).map((el) => ({
                    id: el.getElementsByTagName('Id')[0].textContent,
                    name: el.getElementsByTagName('Name')[0].textContent,
                    short_name: el.getElementsByTagName('ShortName')[0].textContent,
                }));
            } catch (error) {
                console.error('ошибка при загрузке корпусов: ', error);
            }
        },
        selectBuilding(buildingId) {
            this.$emit('building-selected', buildingId);
        }
    }
};
</script>

<style scoped>
.building-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 10px;
    width: 100%;
    justify-items: center;
}

.building-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 500px;
    height: 80px;
    background-color: #42b983;
    border: none;
    color: white;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    overflow-wrap: break-word;
    transition: background-color 0.3s;
}

.building-button:hover {
    background-color: #2c8c6d;
}
</style>
