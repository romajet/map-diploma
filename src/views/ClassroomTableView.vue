<template>
    <div>
        <ClassroomTable :building-id="buildingId" />
    </div>
</template>

<script>
import ClassroomTable from '@/components/ClassroomTable.vue';

export default {
    name: 'ClassroomTableView',
    props: {
        id: {
            type: String,
            required: true
        }
    },
    computed: {
        buildingId() {
            return this.id;
        }
    }
}
</script>
