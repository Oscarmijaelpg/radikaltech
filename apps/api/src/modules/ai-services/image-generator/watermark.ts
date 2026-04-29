import sharp from 'sharp';

/**
 * Composites a logo onto a base image.
 * The logo will be scaled to 25% of the base image's width and placed in the bottom right corner with some padding.
 */
export async function watermarkImage(baseBuf: Buffer, logoBuf: Buffer): Promise<Buffer> {
  try {
    const baseImage = sharp(baseBuf);
    const baseMetadata = await baseImage.metadata();

    if (!baseMetadata.width || !baseMetadata.height) {
      return baseBuf;
    }

    // Target logo width: 25% of the base image width
    const targetLogoWidth = Math.round(baseMetadata.width * 0.25);
    const padding = Math.round(baseMetadata.width * 0.05);

    // Resize the logo
    const resizedLogo = await sharp(logoBuf)
      .resize({ width: targetLogoWidth, fit: 'inside' })
      .toBuffer();

    // Composite the logo onto the base image
    return await baseImage
      .composite([
        {
          input: resizedLogo,
          gravity: 'southeast',
          top: undefined, // Let gravity handle it, but we can add padding by using math if we want
        },
      ])
      .toBuffer();
  } catch (error) {
    // If anything fails, return the original buffer so we don't break the generation pipeline
    return baseBuf;
  }
}

/**
 * Advanced composite with exact padding.
 */
export async function watermarkImageWithPadding(baseBuf: Buffer, logoBuf: Buffer): Promise<Buffer> {
  try {
    const baseImage = sharp(baseBuf);
    const baseMetadata = await baseImage.metadata();
    
    if (!baseMetadata.width || !baseMetadata.height) {
      return baseBuf;
    }

    const targetLogoWidth = Math.round(baseMetadata.width * 0.20);
    const padding = Math.round(baseMetadata.width * 0.04);

    const resizedLogo = await sharp(logoBuf)
      .resize({ width: targetLogoWidth, fit: 'inside' })
      .toBuffer();
      
    const logoMeta = await sharp(resizedLogo).metadata();

    const left = baseMetadata.width - (logoMeta.width || targetLogoWidth) - padding;
    const top = baseMetadata.height - (logoMeta.height || 0) - padding;

    return await baseImage
      .composite([
        {
          input: resizedLogo,
          left: Math.max(0, left),
          top: Math.max(0, top),
        },
      ])
      .toBuffer();
  } catch (error) {
    console.error('Watermark error:', error);
    return baseBuf;
  }
}

