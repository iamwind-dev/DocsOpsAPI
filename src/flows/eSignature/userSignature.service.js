/**
 * User Signature Service
 * 
 * Workflow 17: User Signature Creation & Management
 * Xử lý tạo và quản lý chữ ký điện tử của user
 * 
 * KHÔNG ảnh hưởng code hiện tại - module độc lập
 */

const crypto = require('crypto');
const { supabaseAdmin } = require('../../config/supabase');

/**
 * Hash PIN với SHA-256
 * @param {string} pin 
 * @returns {string}
 */
const hashPin = (pin) => {
  const cleanPin = String(pin).trim();
  const hash = crypto.createHash('sha256').update(cleanPin).digest('hex');
  console.log('HashPin - Input:', `"${pin}"`, '→ Cleaned:', `"${cleanPin}"`, '→ Hash:', hash.substring(0, 16) + '...');
  return hash;
};

/**
 * Upload signature image lên Supabase Storage
 * @param {string} userId 
 * @param {string} base64Image - Base64 encoded image
 * @param {string} signatureType - 'drawn' | 'uploaded' | 'typed'
 * @returns {Promise<{storagePath: string, publicUrl: string}>}
 */
const uploadSignatureImage = async (userId, base64Image, signatureType = 'drawn') => {
  // Normalize signature type (fix typos)
  const validTypes = { 'draw': 'drawn', 'drawn': 'drawn', 'upload': 'uploaded', 'uploaded': 'uploaded', 'type': 'typed', 'typed': 'typed' };
  const normalizedType = validTypes[signatureType?.toLowerCase()] || 'drawn';
  
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  // Determine file extension from base64 header
  let extension = 'png';
  if (base64Image.includes('data:image/jpeg')) extension = 'jpg';
  if (base64Image.includes('data:image/svg')) extension = 'svg';
  
  // Create unique filename
  const timestamp = Date.now();
  const filename = `${userId}/${normalizedType}_${timestamp}.${extension}`;
  const storagePath = `signatures/${filename}`;
  
  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin.storage
    .from('user-signature')
    .upload(storagePath, imageBuffer, {
      contentType: `image/${extension}`,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error('Failed to upload signature image');
  }

  // Get public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from('user-signature')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicUrlData.publicUrl,
  };
};

/**
 * Tạo chữ ký mới cho user
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.signatureImage - Base64 image
 * @param {string} params.pin
 * @param {string} params.signatureType - 'drawn' | 'uploaded' | 'typed'
 * @param {boolean} params.setAsDefault
 * @returns {Promise<Object>}
 */
const createUserSignature = async ({ userId, signatureImage, pin, signatureType = 'drawn', setAsDefault = true }) => {
  // Normalize signature type (fix common typos: 'draw' → 'drawn')
  const validTypes = { 'draw': 'drawn', 'drawn': 'drawn', 'upload': 'uploaded', 'uploaded': 'uploaded', 'type': 'typed', 'typed': 'typed' };
  const normalizedType = validTypes[signatureType?.toLowerCase()] || 'drawn';
  
  console.log('Original signatureType:', signatureType, '→ Normalized:', normalizedType);
  
  // 1. Hash PIN
  const pinHash = hashPin(pin);
  
  // 2. Upload image
  const { storagePath, publicUrl } = await uploadSignatureImage(userId, signatureImage, normalizedType);
  
  // 3. Nếu setAsDefault, hủy default của các signature cũ
  if (setAsDefault) {
    await supabaseAdmin
      .from('user_signature_images')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  
  // 4. Lưu vào database user_signature_images
  const { data: signatureImage_, error: imageError } = await supabaseAdmin
    .from('user_signature_images')
    .insert({
      user_id: userId,
      signature_type: signatureType,
      image_storage_path: storagePath,
      image_url: publicUrl,
      is_default: setAsDefault,
      metadata: { created_via: 'workflow17' },
    })
    .select()
    .single();

  if (imageError) {
    console.error('Save image record error:', imageError);
    throw new Error('Failed to save signature image record');
  }

  console.log('✅ Signature image saved:', signatureImage_.id);

  // 5. Cập nhật hoặc tạo record trong user_signatures (bảng gốc)
  console.log('Step 5: Checking existing user_signatures...');
  const { data: existingSignature, error: fetchError } = await supabaseAdmin
    .from('user_signatures')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error fetching user_signatures:', fetchError);
  }

  console.log('Existing signature:', existingSignature ? existingSignature.id : 'NONE');

  let userSignature;
  if (existingSignature) {
    // Update existing
    console.log('Updating existing user_signatures...');
    const { data, error } = await supabaseAdmin
      .from('user_signatures')
      .update({
        pin_hash: pinHash,
        // Note: user_signatures table doesn't have updated_at column
      })
      .eq('id', existingSignature.id)
      .select()
      .single();
    
    if (error) {
      console.error('=== UPDATE USER_SIGNATURES ERROR ===');
      console.error('Error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to update user signature: ${error.message}`);
    }
    console.log('✅ Updated user_signatures:', data.id);
    userSignature = data;
  } else {
    // Create new - generate secret_key
    console.log('Creating new user_signatures...');
    const secretKey = crypto.randomBytes(32).toString('hex');
    
    const { data, error } = await supabaseAdmin
      .from('user_signatures')
      .insert({
        user_id: userId,
        pin_hash: pinHash,
        secret_key: secretKey,
        label: 'Default Signature',
      })
      .select()
      .single();
    
    if (error) {
      console.error('=== CREATE USER_SIGNATURES ERROR ===');
      console.error('Error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create user signature: ${error.message}`);
    }
    console.log('✅ Created user_signatures:', data.id);
    userSignature = data;
  }

  return {
    signatureId: userSignature.id,
    signatureImageId: signatureImage_.id,
    imageUrl: publicUrl,
    signatureType,
    isDefault: setAsDefault,
  };
};

/**
 * Lấy danh sách chữ ký của user
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
const getUserSignatures = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('user_signature_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get signatures error:', error);
    throw new Error('Failed to get user signatures');
  }

  return data || [];
};

/**
 * Lấy chữ ký mặc định của user
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
const getDefaultSignature = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('user_signature_images')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Get default signature error:', error);
    throw new Error('Failed to get default signature');
  }

  return data || null;
};

/**
 * Xóa chữ ký
 * @param {string} signatureImageId 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
const deleteSignature = async (signatureImageId, userId) => {
  // Get signature to delete file from storage
  const { data: signature, error: fetchError } = await supabaseAdmin
    .from('user_signature_images')
    .select('*')
    .eq('id', signatureImageId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !signature) {
    throw new Error('Signature not found');
  }

  // Delete from storage
  if (signature.image_storage_path) {
    await supabaseAdmin.storage
      .from('user-signature')
      .remove([signature.image_storage_path]);
  }

  // Delete from database
  const { error: deleteError } = await supabaseAdmin
    .from('user_signature_images')
    .delete()
    .eq('id', signatureImageId);

  if (deleteError) {
    throw new Error('Failed to delete signature');
  }

  return true;
};

/**
 * Set signature as default
 * @param {string} signatureImageId 
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
const setDefaultSignature = async (signatureImageId, userId) => {
  // Unset all defaults
  await supabaseAdmin
    .from('user_signature_images')
    .update({ is_default: false })
    .eq('user_id', userId);

  // Set new default
  const { data, error } = await supabaseAdmin
    .from('user_signature_images')
    .update({ is_default: true })
    .eq('id', signatureImageId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to set default signature');
  }

  return data;
};

/**
 * Verify PIN
 * @param {string} userId 
 * @param {string} pin 
 * @returns {Promise<boolean>}
 */
const verifyPin = async (userId, pin) => {
  console.log('=== VERIFY PIN SERVICE ===');
  console.log('User ID:', userId);
  console.log('PIN input:', pin, 'Type:', typeof pin, 'Length:', pin?.length);
  
  // Get the most recent active signature (handle multiple records)
  const { data: userSignatures, error } = await supabaseAdmin
    .from('user_signatures')
    .select('pin_hash')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !userSignatures || userSignatures.length === 0) {
    console.log('No user signature found or error:', error);
    return false;
  }

  const userSignature = userSignatures[0];
  const inputHash = hashPin(pin);
  console.log('Input PIN hash:', inputHash);
  console.log('Stored PIN hash:', userSignature.pin_hash);
  console.log('Match:', inputHash === userSignature.pin_hash);
  
  return inputHash === userSignature.pin_hash;
};

/**
 * Upload signature image from Buffer (for file uploads)
 * @param {string} userId 
 * @param {Buffer} imageBuffer 
 * @param {string} signatureType 
 * @returns {Promise<{storagePath: string, publicUrl: string}>}
 */
const uploadSignatureImageFromBuffer = async (userId, imageBuffer, signatureType = 'drawn') => {
  const validTypes = { 'draw': 'drawn', 'drawn': 'drawn', 'upload': 'uploaded', 'uploaded': 'uploaded', 'type': 'typed', 'typed': 'typed' };
  const normalizedType = validTypes[signatureType?.toLowerCase()] || 'drawn';
  
  const timestamp = Date.now();
  const filename = `${userId}/${normalizedType}_${timestamp}.png`;
  const storagePath = `signatures/${filename}`;
  
  const { error: uploadError } = await supabaseAdmin.storage
    .from('user-signature')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error:', JSON.stringify(uploadError, null, 2));
    console.error('Bucket: user-signature');
    console.error('Path:', storagePath);
    console.error('Buffer size:', imageBuffer.length);
    throw new Error(`Failed to upload signature image: ${uploadError.message || JSON.stringify(uploadError)}`);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('user-signature')
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicUrlData.publicUrl,
  };
};

/**
 * Create user signature directly from Buffer (for file uploads)
 */
const createUserSignatureFromBuffer = async ({ userId, imageBuffer, pin, signatureType = 'drawn', label, isDefault = true }) => {
  const validTypes = { 'draw': 'drawn', 'drawn': 'drawn', 'upload': 'uploaded', 'uploaded': 'uploaded', 'type': 'typed', 'typed': 'typed' };
  const normalizedType = validTypes[signatureType?.toLowerCase()] || 'drawn';
  
  console.log('Original signatureType:', signatureType, '→ Normalized:', normalizedType);
  
  // 1. Hash PIN
  const pinHash = hashPin(pin);
  
  // 2. Upload image from buffer
  const { storagePath, publicUrl } = await uploadSignatureImageFromBuffer(userId, imageBuffer, normalizedType);
  
  // 3. Unset defaults if needed (MUST be done before insert to avoid constraint violation)
  if (isDefault) {
    console.log('Unsetting existing default signatures...');
    const { error: unsetError } = await supabaseAdmin
      .from('user_signature_images')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);
    
    if (unsetError) {
      console.error('Unset defaults error:', unsetError);
    }
  }
  
  // 4. Save signature image record
  let signatureImage_;
  const { data: signatureImageData, error: imageError } = await supabaseAdmin
    .from('user_signature_images')
    .insert({
      user_id: userId,
      signature_type: normalizedType,
      image_storage_path: storagePath,
      image_url: publicUrl,
      is_default: isDefault,
      metadata: { 
        label: label || `${normalizedType} signature`,
        created_via: 'workflow17_buffer'
      },
    })
    .select()
    .single();

  if (imageError) {
    console.error('Save image record error:', imageError);
    
    // If constraint violation, try one more time after explicitly unsetting defaults
    if (imageError.code === '23505' && imageError.message.includes('idx_sig_images_one_default')) {
      console.log('Constraint violation detected, forcing unset defaults and retrying...');
      await supabaseAdmin
        .from('user_signature_images')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Retry insert
      const { data: retryData, error: retryError } = await supabaseAdmin
        .from('user_signature_images')
        .insert({
          user_id: userId,
          signature_type: normalizedType,
          image_storage_path: storagePath,
          image_url: publicUrl,
          is_default: isDefault,
          metadata: { 
            label: label || `${normalizedType} signature`,
            created_via: 'workflow17_buffer'
          },
        })
        .select()
        .single();
      
      if (retryError) {
        console.error('Retry insert error:', retryError);
        throw new Error(`Failed to save signature image record: ${retryError.message}`);
      }
      
      signatureImage_ = retryData;
    } else {
      throw new Error(`Failed to save signature image record: ${imageError.message}`);
    }
  } else {
    signatureImage_ = signatureImageData;
  }

  console.log('✅ Signature image saved:', signatureImage_.id);

  // 5. Update or create user_signatures
  console.log('Step 5: Checking existing user_signatures...');
  const { data: existingSignatures, error: fetchError } = await supabaseAdmin
    .from('user_signatures')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null);

  if (fetchError) {
    console.error('Error fetching user_signatures:', fetchError);
  }

  console.log('Existing active signatures:', existingSignatures?.length || 0);

  let userSignature;
  if (existingSignatures && existingSignatures.length > 0) {
    // Update the first active signature
    const existingId = existingSignatures[0].id;
    console.log('Updating existing user_signatures:', existingId);
    const { data, error } = await supabaseAdmin
      .from('user_signatures')
      .update({ pin_hash: pinHash })
      .eq('id', existingId)
      .select()
      .single();
    
    if (error) {
      console.error('=== UPDATE USER_SIGNATURES ERROR ===');
      console.error('Error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to update user signature: ${error.message}`);
    }
    userSignature = data;
    console.log('✅ Updated user_signatures:', data.id);
  } else {
    console.log('Creating new user_signatures...');
    const secretKey = crypto.randomBytes(32).toString('hex');
    const { data, error } = await supabaseAdmin
      .from('user_signatures')
      .insert({
        user_id: userId,
        pin_hash: pinHash,
        secret_key: secretKey,
      })
      .select()
      .single();
    
    if (error) {
      console.error('=== CREATE USER_SIGNATURES ERROR ===');
      console.error('Error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create user signature: ${error.message}`);
    }
    userSignature = data;
    console.log('✅ Created user_signatures:', data.id);
  }

  return {
    signatureId: userSignature.id,
    signatureImageId: signatureImage_.id,
    publicUrl,
    signatureType: normalizedType,
    isDefault,
  };
};

module.exports = {
  hashPin,
  uploadSignatureImage,
  uploadSignatureImageFromBuffer,
  createUserSignature,
  createUserSignatureFromBuffer,
  getUserSignatures,
  getDefaultSignature,
  deleteSignature,
  setDefaultSignature,
  verifyPin,
};
