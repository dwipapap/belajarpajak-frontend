<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <DocumentGuruMonitor
    module="faktur-keluaran"
    api-base="/api/v1/faktur-keluaran"
    label="Pajak Keluaran"
    group="e-Faktur"
    number-header="Nomor Faktur"
    code-header="Kode Transaksi"
    base-header="Harga Jual/DPP (Rp)"
    tax-header="PPN (Rp)"
    :fields="{
      number: 'invoice_number',
      name: 'buyer_name',
      code: 'transaction_code',
      base: 'total_dpp',
      tax: 'total_ppn'
    }"
    :invalidate="null"
  />
</template>
