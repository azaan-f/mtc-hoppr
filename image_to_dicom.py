import argparse
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid
from pydicom.data import get_testdata_file
import numpy as np
from PIL import Image
import os
from datetime import datetime

def convert_image_to_dicom(image_path: str, output_path: str = None) -> str:
    if output_path is None:
        base_name = os.path.splitext(image_path)[0]
        output_path = f"{base_name}.dcm"
    
    image = Image.open(image_path)
    
    if image.mode == 'RGBA':
        image = image.convert('RGB')
    elif image.mode != 'L' and image.mode != 'RGB':
        image = image.convert('RGB')
    
    if image.mode == 'RGB':
        image = image.convert('L')
    
    pixel_array = np.array(image, dtype=np.uint16)
    
    if pixel_array.dtype != np.uint16:
        pixel_array = (pixel_array.astype(np.float32) * (65535.0 / 255.0)).astype(np.uint16)
    
    file_meta = Dataset()
    file_meta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.1'
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.ImplementationClassUID = generate_uid()
    file_meta.TransferSyntaxUID = '1.2.840.10008.1.2'
    
    ds = FileDataset(output_path, {}, file_meta=file_meta, preamble=b'\x00' * 128)
    
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.1'
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.StudyDate = datetime.now().strftime('%Y%m%d')
    ds.StudyTime = datetime.now().strftime('%H%M%S')
    ds.Modality = 'CR'
    ds.SeriesDescription = 'Converted from image file'
    ds.PatientName = 'Anonymous^Patient'
    ds.PatientID = ''
    ds.PatientBirthDate = ''
    ds.PatientSex = ''
    ds.Rows = pixel_array.shape[0]
    ds.Columns = pixel_array.shape[1]
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    ds.PixelRepresentation = 0
    ds.PixelSpacing = [1.0, 1.0]
    
    ds.PixelData = pixel_array.tobytes()
    
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    
    ds.save_as(output_path, write_like_original=False)
    
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert PNG/JPG image to DICOM format")
    parser.add_argument("input_path", type=str, help="Path to input image file")
    parser.add_argument("--output", type=str, help="Path to output DICOM file (optional)")
    args = parser.parse_args()
    
    if not os.path.exists(args.input_path):
        print(f"Error: File not found: {args.input_path}")
        exit(1)
    
    try:
        output_path = convert_image_to_dicom(args.input_path, args.output)
        print(f"Successfully converted {args.input_path} to {output_path}")
        print(output_path)
    except Exception as e:
        print(f"Error converting image: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
