import sys
import io

# Force UTF-8 output encoding for Windows terminal
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from ai.api import app, predict_price, PricePredictionRequest, voice_assistant, VoiceQueryRequest, get_demand_trends, get_artisan_insights, recommend_markets, MarketMatchRequest

def run_tests():
    print("\n=============================================")
    print("      CRAFTCONNECT BACKEND UNIT TESTS        ")
    print("=============================================\n")

    # 1. Test Price Prediction Endpoint
    print("1. Testing /predict-price ML endpoint...")
    req_price = PricePredictionRequest(
        product_name="Handcrafted Terracotta Diya Set",
        primary_category="Decor",
        secondary_category="Clay Craft",
        tertiary_category="Terracotta"
    )
    res_price = predict_price(req_price)
    print(f"   ML Price Result: {res_price['predicted_price_tier']} | Range: {res_price['estimated_inr_range']} | Confidence: {res_price['confidence']}")
    assert res_price["status"] == "success"

    # 2. Test Voice Assistant Endpoint
    print("\n2. Testing /voice-assistant AI endpoint...")
    req_voice = VoiceQueryRequest(
        query="Mera terracotta product kis daam par bechna chahiye?",
        language="hi-IN"
    )
    res_voice = voice_assistant(req_voice)
    print(f"   Voice AI Response: {res_voice['response_text'][:120]} ...")
    assert res_voice["status"] == "success"

    # 3. Test Market Linkage Recommendation
    print("\n3. Testing /recommend-markets AI endpoint...")
    req_market = MarketMatchRequest(
        category="Pottery",
        craft_type="Terracotta",
        artisan_location="Jaipur, Rajasthan"
    )
    res_market = recommend_markets(req_market)
    print(f"   Market Linkages: {len(res_market['markets'])} markets found.")
    assert res_market["status"] == "success"

    # 4. Test Demand Trends Endpoint
    print("\n4. Testing /demand-trends endpoint...")
    res_trends = get_demand_trends()
    print(f"   Top Craft: {res_trends['top_trending_crafts'][0]['craft']} | Growth: {res_trends['top_trending_crafts'][0]['growth']}")
    assert res_trends["status"] == "success"

    # 5. Test Artisan Insights Endpoint
    print("\n5. Testing /artisan-insights endpoint...")
    res_artisan = get_artisan_insights()
    print(f"   Artisan: {res_artisan['artisan_name']} | Specialties: {res_artisan['specialties']}")
    assert res_artisan["artisan_name"] == "Sita Devi"

    print("\n=============================================")
    print("   🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY! ")
    print("=============================================\n")

if __name__ == "__main__":
    run_tests()
