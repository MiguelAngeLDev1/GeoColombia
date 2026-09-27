from datetime import datetime, timezone

from app.services.mining_service import MiningService


def test_from_anm_feature_normalizes_mining_title():
    feature = {
        "attributes": {
            "CODIGO_EXPEDIENTE": "TDG-08281",
            "AREA_HA": 1173.6383,
            "FECHA_DE_INSCRIPCION": 1577836800000,
            "ESTADO": "Activo",
            "MODALIDAD": "CONTRATO DE CONCESIÓN (L 685)",
            "ETAPA": "Exploración",
            "MINERALES": "CARBÓN",
            "DEPARTAMENTOS": "Norte de Santander",
            "MUNICIPIOS": "SARDINATA",
        }
    }

    result = MiningService.from_anm_feature(feature)

    assert result.code == "TDG-08281"
    assert result.area_ha == 1173.6383
    assert result.registration_date == datetime(
        2020, 1, 1, tzinfo=timezone.utc
    )
    assert result.status == "Activo"
    assert result.modality == "CONTRATO DE CONCESIÓN (L 685)"
    assert result.stage == "Exploración"
    assert result.minerals == "CARBÓN"
    assert result.departments == "Norte de Santander"
    assert result.municipalities == "SARDINATA"