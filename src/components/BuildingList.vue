<!-- src/components/BuildingList.vue -->
<template>
    <div class="building-list">
        <button v-for="building in buildings" :key="building.id" @click="selectBuilding(building.id)"
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
    methods: {
        async fetchBuildings() {
            try {
                axios.get('/buildings').then(res => 
                    this.buildings = res.data.map((el) => ({
                        id: el.Id,
                        name: el.Name,
                        short_name: el.ShortName,
                    }))
                );
            } catch (error) {
                console.error('что-то создает ошибки при загрузке корпусов: ', error);
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
    background-color: #275886;
    border: none;
    color: white;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    overflow-wrap: break-word;
    transition: background-color 0.3s;
}

.building-button:hover {
    background-color: #2c72a5;
}
</style>
