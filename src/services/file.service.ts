import { BadRequestException, Injectable } from '@nestjs/common'
import { writeFile } from 'fs/promises'
import * as mimeTypes from 'mime-types'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { RedisService } from './redis.service'

@Injectable()
export class fileService {
  constructor(private redisService: RedisService) {}

  async validateFile(file: Express.Multer.File): Promise<void> {
    try {
      if (!file) {
        throw new BadRequestException('Berkas tidak ditemukan')
      }

      const allowedFileTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      const maxFileSizeInBytes = 10 * 1024 * 1024

      // Periksa tipe berkas
      const fileMime = mimeTypes.lookup(file.originalname)
      if (!allowedFileTypes.includes(fileMime)) {
        throw new BadRequestException(`Tipe berkas tidak valid. Hanya diperbolehkan: ${allowedFileTypes.join(', ')}`)
      }

      // Periksa ukuran berkas
      if (file.size > maxFileSizeInBytes) {
        throw new BadRequestException(`Ukuran berkas melebihi batas maksimum (10MB)`)
      }
    } catch (error) {
      throw new BadRequestException('gagal input berkas')
    }
  }

  async uploadFile(file: Express.Multer.File) {
    this.validateFile(file)
    const fileExtension = file?.originalname.split('.').pop()?.toLowerCase()
    const savedFileName = `${uuidv4()}.${fileExtension}`
    const filePath = join(__dirname, '..', '../public', savedFileName)
    await writeFile(filePath, file.buffer, 'binary')
    const data = {
      id: uuidv4(),
      filename: savedFileName,
    }
    await this.redisService.set(data.id, JSON.stringify(data))
    const response = {
      id: data.id,
      filename: data.filename,
    }
    return response
  }
}
