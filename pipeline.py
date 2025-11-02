import argparse
import asyncio
from typing import Optional
from hopprai import HOPPR

MODEL_ID_TO_FINDING = {
    "mc_chestradiography_air_space_opacity:v1.20250828": "Air Space Opacity",
    "mc_chestradiography_atelectasis:v1.20250828": "Atelectasis",
    "mc_chestradiography_bronchial_wall_thickening:v1.20250828": "Bronchial Wall Thickening",
    "mc_chestradiography_bullous_disease:v1.20250828": "Bullous Disease",
    "mc_chestradiography_cardiomegaly:v1.20250828": "Cardiomegaly",
    "mc_chestradiography_hiatus_hernia:v1.20250828": "Hiatus Hernia",
    "mc_chestradiography_hilar_lymphadenopathy:v1.20250828": "Hilar Lymphadenopathy",
    "mc_chestradiography_hyperinflation:v1.20250828": "Hyperinflation",
    "mc_chestradiography_implantable_electronic_device:v1.20250828": "Implantable Electronic Device",
    "mc_chestradiography_intercostal_drain:v1.20250828": "Intercostal Drain",
    "mc_chestradiography_interstitial_thickening:v1.20250828": "Interstitial Thickening",
    "mc_chestradiography_lobar_segmental_collapse:v1.20250828": "Lobar/Segmental Collapse",
    "mc_chestradiography_lung_nodule_or_mass:v1.20250828": "Lung Nodule or Mass",
    "mc_chestradiography_nonsurgical_internal_foreign_body:v1.20250828": "Nonsurgical Internal Foreign Body",
    "mc_chestradiography_pacemaker_electronic_cardiac_device_or_wires:v1.20250828": "Pacemaker / Cardiac Device",
    "mc_chestradiography_peribronchial_cuffing:v1.20250828": "Peribronchial Cuffing",
    "mc_chestradiography_pleural_effusion:v1.20250828": "Pleural Effusion",
    "mc_chestradiography_pneumothorax:v1.20250828": "Pneumothorax",
    "mc_chestradiography_pulmonary_artery_enlargement:v1.20250828": "Pulmonary Artery Enlargement",
    "mc_chestradiography_pulmonary_congestion_pulmonary_venous_congestion:v1.20250828": "Pulmonary Congestion",
    "mc_chestradiography_shoulder_dislocation:v1.20250828": "Shoulder Dislocation",
    "mc_chestradiography_subcutaneous_emphysema:v1.20250828": "Subcutaneous Emphysema",
    "mc_chestradiography_tracheal_deviation:v1.20250828": "Tracheal Deviation",
    "mc_chestradiography_whole_lung_or_majority_collapse:v1.20250828": "Whole Lung Collapse",
}


async def run_model(hoppr, study_id, model_id, prompt):
    """Run a single Hoppr model and return a structured result."""
    def call_model():
        if model_id == "cxr-vlm-experimental":
            return hoppr.prompt_model(
                study_id,
                model_id,
                prompt=prompt,
                response_format="json",
            )
        else:
            return hoppr.prompt_model(
                study_id,
                model_id,
                prompt="",
                organization="hoppr",
                response_format="json",
            )

    response = await asyncio.to_thread(call_model)
    
    if response is None:
        print(f"Warning: No response received for model {model_id}")
        if model_id == "cxr-vlm-experimental":
            return {"vlm_output": "Model response unavailable"}
        else:
            return {model_id: {"score": 0.0, "positive": False}}
    
    if not hasattr(response, 'response') or response.response is None:
        print(f"Warning: Invalid response format for model {model_id}")
        if model_id == "cxr-vlm-experimental":
            return {"vlm_output": "Model response format invalid"}
        else:
            return {model_id: {"score": 0.0, "positive": False}}
    
    payload = response.response

    if model_id == "cxr-vlm-experimental":
        findings = payload.get("findings") or payload.get("response") or str(payload)
        findings = findings.encode('ascii', errors='replace').decode('ascii')
        return {"vlm_output": findings}

    try:
        score = float(payload["score"])
        model_name = payload["model"]
        return {model_name: {"score": score, "positive": score > 0.5}}
    except (KeyError, ValueError, TypeError) as e:
        print(f"Warning: Failed to parse payload for model {model_id}: {e}")
        print(f"Payload: {payload}")
        return {model_id: {"score": 0.0, "positive": False}}


async def run_tier(hoppr, study_id, model_ids):
    tasks = [run_model(hoppr, study_id, m, prompt="") for m in model_ids]
    
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as e:
        print(f"Error running tier models: {e}")
        return {}
    
    classification = {}
    for i, item in enumerate(results):
        if isinstance(item, Exception):
            print(f"Model {model_ids[i]} failed with error: {item}")
            classification[model_ids[i]] = {"score": 0.0, "positive": False}
        elif item and isinstance(item, dict):
            classification.update(item)
    return classification


async def analyse_study(hoppr, study_id, tiers, vlm_prompt):
    vlm_result = await run_model(hoppr, study_id, "cxr-vlm-experimental", vlm_prompt)
    vlm_output = vlm_result["vlm_output"]

    classification = {}
    for i, tier_models in enumerate(tiers, start=1):
        if not tier_models:
            continue
        print(f"\n--- Running tier {i} models: {tier_models} ---")
        tier_results = await run_tier(hoppr, study_id, tier_models)
        for model_name, info in tier_results.items():
            score = info["score"]
            positive = info["positive"]
            print(f"  {model_name}: score={score:.3f}, positive={positive}")
        classification.update(tier_results)

    return vlm_output, classification


def format_analysis_results(classification, vlm_output):
    positive_findings = []
    negative_findings = []
    for model_name, info in classification.items():
        finding_name = MODEL_ID_TO_FINDING.get(model_name, model_name)
        score = info["score"]
        if info["positive"]:
            positive_findings.append(f"- {finding_name}: {score:.3f}")
        else:
            negative_findings.append(f"- {finding_name}: {score:.3f}")

    lines = [
        "CHEST X-RAY ANALYSIS REPORT",
        "=" * 40,
        "",
        "FINDINGS EXPLANATION:",
        "- POSITIVE FINDINGS: Abnormalities detected with high confidence (score > 0.5)",
        "  These indicate the presence of the medical condition in the chest X-ray",
        "- NEGATIVE FINDINGS: Conditions ruled out with low probability (score <= 0.5)",
        "  These indicate the absence of the medical condition in the chest X-ray",
        "",
        "POSITIVE FINDINGS (Detected Abnormalities):",
    ]
    if positive_findings:
        lines.extend(positive_findings)
    else:
        lines.append("- No abnormalities detected - chest X-ray appears normal")

    lines.extend([
        "",
        "NEGATIVE FINDINGS (Conditions Ruled Out):",
    ])
    if negative_findings:
        lines.extend(negative_findings)
    else:
        lines.append("- All analyzed conditions were detected as present")

    lines.extend([
        "",
        "RADIOLOGIST VLM NARRATIVE:",
        "-" * 30,
        vlm_output,
        "",
        "SUMMARY:",
        f"- Total conditions analyzed: {len(classification)}",
        f"- Abnormalities detected: {len(positive_findings)}",
        f"- Conditions ruled out: {len(negative_findings)}",
        "",
        "INTERPRETATION GUIDE:",
        "- Scores range from 0.0 to 1.0 (0% to 100% confidence)",
        "- Threshold: 0.5 (50% confidence) separates positive from negative",
        "- Higher scores indicate stronger evidence of the condition",
        "- Lower scores indicate stronger evidence against the condition",
    ])
    output = "\n".join(lines)
    
    output = output.encode('ascii', errors='replace').decode('ascii')
    
    return output


def run_pipeline(
    dicom_path: str,
):
    
    api_key = "RmTQz4CowITpnjNdBAFbvjRaMlyARl9g3WUWVIhu"
    base_url = "https://api.hoppr.ai"

    hoppr = HOPPR(api_key=api_key, base_url=base_url)

    study = hoppr.create_study("my-study-reference-123")
    print(f"Created study: {study.id}")

    with open(dicom_path, "rb") as f:
        image_data = f.read()
    image = hoppr.add_study_image(study.id, "image-001", image_data)
    print(f"Added image: {image.id}")

    tier1 = [
        "mc_chestradiography_pneumothorax:v1.20250828",
        "mc_chestradiography_pleural_effusion:v1.20250828",
        "mc_chestradiography_whole_lung_or_majority_collapse:v1.20250828",
        "mc_chestradiography_lung_nodule_or_mass:v1.20250828",
        "mc_chestradiography_air_space_opacity:v1.20250828",
        "mc_chestradiography_cardiomegaly:v1.20250828",
        "mc_chestradiography_pulmonary_congestion_pulmonary_venous_congestion:v1.20250828",
        "mc_chestradiography_tracheal_deviation:v1.20250828",
    ]
    tier2 = [
        "mc_chestradiography_atelectasis:v1.20250828",
        "mc_chestradiography_interstitial_thickening:v1.20250828",
        "mc_chestradiography_pulmonary_artery_enlargement:v1.20250828",
        "mc_chestradiography_hyperinflation:v1.20250828",
        "mc_chestradiography_bullous_disease:v1.20250828",
        "mc_chestradiography_hilar_lymphadenopathy:v1.20250828",
        "mc_chestradiography_bronchial_wall_thickening:v1.20250828",
        "mc_chestradiography_peribronchial_cuffing:v1.20250828",
        "mc_chestradiography_subcutaneous_emphysema:v1.20250828",
        "mc_chestradiography_shoulder_dislocation:v1.20250828",
    ]
    tier3 = [
        "mc_chestradiography_hiatus_hernia:v1.20250828",
        "mc_chestradiography_implantable_electronic_device:v1.20250828",
        "mc_chestradiography_intercostal_drain:v1.20250828",
        "mc_chestradiography_nonsurgical_internal_foreign_body:v1.20250828",
        "mc_chestradiography_pacemaker_electronic_cardiac_device_or_wires:v1.20250828",
    ]
    tiers = [tier1, tier2, tier3]

    vlm_prompt = (
        "Please describe the findings of this chest X-ray in plain language for a patient, "
        "including any abnormalities you see."
    )

    vlm_output, classification = asyncio.run(
        analyse_study(
            hoppr=hoppr,
            study_id=study.id,
            tiers=tiers,
            vlm_prompt=vlm_prompt,
        )
    )

    formatted_output = format_analysis_results(classification, vlm_output)

    print("\n" + "=" * 80)
    print("FORMATTED OUTPUT FOR GPT:")
    print("=" * 80)
    
    return formatted_output


def main():
    import sys
    import io
    
    
    parser = argparse.ArgumentParser(
        description="Run Hoppr models on a DICOM file with tiered inference."
    )
    parser.add_argument("dicom_path", type=str, help="Path to the DICOM file")
    args = parser.parse_args()
    output = run_pipeline(args.dicom_path)
    print(output)


if __name__ == "__main__":
    main()