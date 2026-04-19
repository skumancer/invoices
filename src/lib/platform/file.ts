import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNativePlatform } from './capacitor'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_')
}

export async function savePdfAndShareOrDownload(fileName: string, pdfBytes: Uint8Array): Promise<void> {
  if (isNativePlatform()) {
    const safeName = safeFileName(fileName)
    const base64Data = bytesToBase64(pdfBytes)
    const { uri } = await Filesystem.writeFile({
      path: safeName,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    })

    await Share.share({
      title: 'Invoice PDF',
      url: uri,
      dialogTitle: 'Share invoice PDF',
    })
    return
  }

  const arrayBuffer = new ArrayBuffer(pdfBytes.byteLength)
  new Uint8Array(arrayBuffer).set(pdfBytes)
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
