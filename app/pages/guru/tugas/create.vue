<script setup lang="ts">
import type {
  AssignmentCreate,
  AssignmentDocType,
  AssignmentRead,
  SchoolClass
} from '~/types/api'
import { docTypeToModuleKey, isModuleEnabled } from '~/utils/modules'
import { DOC_TYPE_OPTIONS } from '~/utils/tugas'

definePageMeta({ middleware: 'role', roles: ['guru'] })

const auth = useAuth()
const { apiFetch } = useApi()
const toast = useToast()

const { data: classes, status: classesStatus } = useAsyncData(
  'guru-tugas-create-classes',
  () => apiFetch<SchoolClass[]>('/api/v1/classes'),
  { default: () => [] as SchoolClass[] }
)

const activeClasses = computed(() => (classes.value ?? []).filter(c => !c.archived))

const classOptions = computed(() =>
  activeClasses.value.map(c => ({
    label: `${c.name} (${c.academic_year})`,
    value: c.id
  }))
)

const docTypeOptions = computed(() =>
  DOC_TYPE_OPTIONS
    .filter(o => isModuleEnabled(auth.user.value, docTypeToModuleKey(o.value)))
    .map(o => ({
      label: o.label,
      value: o.value
    }))
)

const form = reactive({
  class_id: undefined as number | undefined,
  title: '',
  doc_type: 'bppu' as AssignmentDocType,
  due_at_local: '',
  instructions: ''
})

watch(docTypeOptions, (opts) => {
  if (opts.length > 0 && !opts.some(o => o.value === form.doc_type)) {
    form.doc_type = opts[0]!.value
  }
}, { immediate: true })

watch(activeClasses, (list) => {
  if (form.class_id === undefined && list.length > 0) {
    form.class_id = list[0]?.id
  }
}, { immediate: true })

const savingMode = ref<'draft' | 'publish' | null>(null)
const errorMessage = ref<string | null>(null)

function validate(): string | null {
  if (!form.class_id) return 'Pilih kelas tujuan terlebih dahulu.'
  if (!form.title.trim()) return 'Judul tugas wajib diisi.'
  if (!form.doc_type) return 'Pilih jenis dokumen yang harus dikumpulkan.'
  if (!form.instructions.trim()) return 'Instruksi / soal studi kasus wajib diisi.'
  return null
}

async function submitForm(publish: boolean) {
  errorMessage.value = null
  const err = validate()
  if (err) {
    errorMessage.value = err
    return
  }

  savingMode.value = publish ? 'publish' : 'draft'
  try {
    let dueIso: string | null = null
    if (form.due_at_local.trim()) {
      const parsed = new Date(form.due_at_local)
      if (!Number.isNaN(parsed.getTime())) {
        dueIso = parsed.toISOString()
      }
    }

    const payload: AssignmentCreate = {
      class_id: form.class_id!,
      title: form.title.trim(),
      instructions: form.instructions.trim(),
      doc_type: form.doc_type,
      due_at: dueIso,
      publish
    }

    const created = await apiFetch<AssignmentRead>('/api/v1/tugas', {
      method: 'POST',
      body: payload
    })

    toast.add({
      title: publish ? 'Tugas berhasil dibuat dan diterbitkan' : 'Tugas disimpan sebagai draf',
      description: created.title,
      color: 'success',
      icon: 'i-lucide-check-circle'
    })

    await navigateTo(`/guru/tugas/${created.id}`)
  } catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Gagal menyimpan tugas.')
  } finally {
    savingMode.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
          <UIcon name="i-lucide-clipboard-plus" class="size-4 text-primary" />
          <span>Ruang Kelas &middot; Buat Tugas</span>
        </div>
        <h1 class="mt-1 text-2xl font-semibold text-highlighted">
          Buat Tugas Praktikum Pajak
        </h1>
        <p class="mt-0.5 text-sm text-muted">
          Tentukan kelas, jenis dokumen pajak, tenggat waktu, serta uraian kasus yang harus dikerjakan siswa.
        </p>
      </div>
      <UButton
        to="/guru/tugas"
        icon="i-lucide-arrow-left"
        label="Kembali ke Daftar Tugas"
        color="neutral"
        variant="soft"
        size="sm"
      />
    </div>

    <UCard>
      <form class="space-y-5" @submit.prevent="submitForm(true)">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            label="Kelas Tujuan"
            required
            help="Hanya kelas aktif yang Anda ampu."
          >
            <USelect
              v-model="form.class_id"
              :items="classOptions"
              :loading="classesStatus === 'pending'"
              placeholder="Pilih kelas"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Jenis Dokumen yang Dikumpulkan"
            required
            help="Siswa memilih dokumen mereka yang sesuai dengan jenis ini."
          >
            <USelect
              v-model="form.doc_type"
              :items="docTypeOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Judul Tugas"
          required
          help="Contoh: Studi Kasus PPh Pasal 23 atas Jasa Konsultasi PT Nusantara."
        >
          <UInput
            v-model="form.title"
            placeholder="Masukkan judul tugas..."
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Tenggat Pengumpulan (Opsional)"
          help="Siswa tetap dapat mengumpulkan setelah tenggat selama tugas belum ditutup, namun ditandai Terlambat."
        >
          <UInput
            v-model="form.due_at_local"
            type="datetime-local"
            class="w-full sm:max-w-xs"
          />
        </UFormField>

        <UFormField
          label="Instruksi &amp; Soal Studi Kasus"
          required
          help="Tuliskan data lawan transaksi, NPWP/NIK, masa pajak, kode objek pajak, nilai bruto/DPP, dan instruksi penerbitan dokumen."
        >
          <UTextarea
            v-model="form.instructions"
            :rows="8"
            placeholder="Tuliskan skenario transaksi perpajakan secara lengkap..."
            class="w-full"
          />
        </UFormField>

        <div class="rounded-lg border border-default bg-elevated/40 p-3.5 text-xs text-muted">
          <p class="font-semibold text-default">
            Tentang Penilaian Otomatis
          </p>
          <p class="mt-1">
            Saat siswa mengumpulkan dokumen, sistem secara otomatis memeriksa kelengkapan status penerbitan, validitas identitas (NPWP/NIK), masa pajak, kesesuaian tarif, rumus perhitungan DPP/PPh/PPN, serta tanda tangan elektronik. Anda tetap dapat meninjau rincian pemeriksaan dan menetapkan nilai akhir guru.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-default pt-4">
          <UButton
            to="/guru/tugas"
            label="Batal"
            color="neutral"
            variant="ghost"
          />
          <UButton
            type="button"
            icon="i-lucide-save"
            label="Simpan sebagai Draf"
            color="neutral"
            variant="soft"
            :loading="savingMode === 'draft'"
            :disabled="savingMode !== null"
            @click="submitForm(false)"
          />
          <UButton
            type="submit"
            icon="i-lucide-send"
            label="Simpan &amp; Terbitkan"
            color="primary"
            :loading="savingMode === 'publish'"
            :disabled="savingMode !== null"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>
