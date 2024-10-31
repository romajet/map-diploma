<!-- src/components/BuildingList.vue -->
<template>
    <div class="Building-list">
        <button v-for="building in buildings" :key="building.id" @click="selectBuilding(building.id)"
            class="building-button">
            {{ building.name }}
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
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.building-button {
    padding: 10px 20px;
    background-color: #42b983;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    transition: background-color 0.3s;
}

.building-button:hover {
    background-color: #2c8c6d;
}
</style>
