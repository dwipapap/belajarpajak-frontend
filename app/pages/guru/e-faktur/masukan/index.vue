<script setup lang="ts">
definePageMeta({ middleware: 'role', roles: ['guru'] })
</script>

<template>
  <DocumentGuruMonitor
    module="faktur-masukan"
    api-base="/api/v1/faktur-masukan"
    label="Pajak Masukan"
    group="e-Faktur"
    number-header="Nomor Faktur"
    code-header="Kode Transaksi"
    base-header="Harga Jual/DPP (Rp)"
    tax-header="PPN (Rp)"
    :fields="{
      number: 'invoice_number',
      name: 'seller_name',
      code: 'transaction_code',
      base: 'total_dpp',
      tax: 'total_ppn'
    }"
    :invalidate="null"
  />
</template>
