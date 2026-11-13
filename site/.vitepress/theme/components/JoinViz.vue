<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXPLAIN, ORDERS, SQL, USERS, join, type JoinKind } from '../lib/join-model'

const KINDS: { id: JoinKind; title: string }[] = [
  { id: 'inner', title: 'INNER' },
  { id: 'left', title: 'LEFT' },
  { id: 'right', title: 'RIGHT' },
  { id: 'full', title: 'FULL' },
  { id: 'anti', title: 'Антиджойн' },
]
const kind = ref<JoinKind>('left')
const rows = computed(() => join(kind.value))

const usedUsers = computed(() => new Set(rows.value.filter((r) => r.order && r.user).map((r) => r.user!.id)))
const usedOrders = computed(() => new Set(rows.value.filter((r) => r.order && r.user).map((r) => r.order!.id)))
const lonely = computed(() => new Set(rows.value.filter((r) => !r.order && r.user).map((r) => r.user!.id)))
</script>

<template>
  <div class="viz">
    <div class="viz-head"><span class="tag">Интерактив</span>JOIN на таблицах учебной базы «магазин»</div>
    <div class="viz-body">
      <div class="viz-controls" style="margin-top: 0">
        <button v-for="k in KINDS" :key="k.id" class="viz-btn" :class="{ on: kind === k.id }" type="button" @click="kind = k.id">{{ k.title }}</button>
      </div>

      <div class="jv-tables">
        <div>
          <div class="jv-cap">users</div>
          <table>
            <thead><tr><th>id</th><th>name</th><th>country</th></tr></thead>
            <tbody>
              <tr v-for="u in USERS" :key="u.id" :class="{ hit: usedUsers.has(u.id), miss: lonely.has(u.id) }">
                <td>{{ u.id }}</td><td>{{ u.name }}</td><td>{{ u.country }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="jv-cap">orders</div>
          <table>
            <thead><tr><th>id</th><th>user_id</th><th>status</th></tr></thead>
            <tbody>
              <tr v-for="o in ORDERS" :key="o.id" :class="{ hit: usedOrders.has(o.id) }">
                <td>{{ o.id }}</td><td>{{ o.user_id }}</td><td>{{ o.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <pre class="jv-sql">{{ SQL[kind] }}</pre>

      <div class="jv-cap">Результат: {{ rows.length }} {{ rows.length === 1 ? 'строка' : 'строк' }}</div>
      <table>
        <thead>
          <tr><th>u.name</th><th v-if="kind !== 'anti'">o.id</th><th v-if="kind !== 'anti'">o.status</th></tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i" :class="{ miss: !r.order && r.user }">
            <td>{{ r.user?.name ?? 'NULL' }}</td>
            <td v-if="kind !== 'anti'" :class="{ nul: !r.order }">{{ r.order?.id ?? 'NULL' }}</td>
            <td v-if="kind !== 'anti'" :class="{ nul: !r.order }">{{ r.order?.status ?? 'NULL' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="viz-note">{{ EXPLAIN[kind] }}</div>
    </div>
  </div>
</template>

<style scoped>
.jv-tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin-top: 14px;
}
.jv-cap {
  margin: 8px 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--vp-c-text-2);
}
.jv-sql {
  margin: 14px 0 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  font-size: 13px;
  white-space: pre;
  overflow-x: auto;
}
tr.hit td {
  background: color-mix(in srgb, var(--viz-ok) 16%, transparent);
}
tr.miss td {
  background: color-mix(in srgb, var(--viz-bad) 16%, transparent);
}
td.nul {
  color: var(--vp-c-text-3);
  font-style: italic;
}
</style>
