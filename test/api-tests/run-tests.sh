#!/bin/bash

# run-tests.sh - Automated test runner for zosql API tests

set -e

# Configuration
BASE_URL=${1:-"http://localhost:3000"}
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../../" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 zosql API Test Runner${NC}"
echo -e "${BLUE}========================${NC}"
echo "Base URL: $BASE_URL"
echo "Project Root: $PROJECT_ROOT"
echo "Test Directory: $TEST_DIR"
echo ""

# Function to check if server is running
check_server() {
    echo -e "${YELLOW}⏳ Checking if server is running...${NC}"
    
    if curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running${NC}"
        return 1
    fi
}

# Function to start server if not running
start_server() {
    echo -e "${YELLOW}🚀 Starting zosql server...${NC}"
    
    cd "$PROJECT_ROOT"
    
    # Build the project first
    echo -e "${YELLOW}📦 Building project...${NC}"
    npm run build
    
    # Start server in background
    echo -e "${YELLOW}🌐 Starting server on port 3000...${NC}"
    npm run dev web > /tmp/zosql-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
    for i in {1..30}; do
        if curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Server started successfully (PID: $SERVER_PID)${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Server failed to start${NC}"
    echo "Server log:"
    cat /tmp/zosql-server.log
    return 1
}

# Function to run basic API tests
run_basic_tests() {
    echo -e "${BLUE}📋 Running basic API tests...${NC}"
    
    cd "$TEST_DIR"
    
    if command -v node > /dev/null 2>&1; then
        node api-test-client.js "$BASE_URL"
        return $?
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        return 1
    fi
}

# Function to run AI auto tests
run_ai_tests() {
    echo -e "${BLUE}🤖 Running AI auto tests...${NC}"
    
    cd "$TEST_DIR"
    
    if command -v node > /dev/null 2>&1; then
        node ai-auto-test.js "$BASE_URL"
        return $?
    else
        echo -e "${RED}❌ Node.js not found${NC}"
        return 1
    fi
}

# Function to run browser tests
run_browser_tests() {
    echo -e "${BLUE}🌐 Running browser integration tests...${NC}"
    
    # Check if we have a browser testing tool
    if command -v curl > /dev/null 2>&1; then
        echo -e "${YELLOW}📱 Testing browser endpoints...${NC}"
        
        # Test main page
        if curl -s -f "$BASE_URL/" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Main page accessible${NC}"
        else
            echo -e "${RED}❌ Main page not accessible${NC}"
            return 1
        fi
        
        # Test static files
        if curl -s -f "$BASE_URL/static/js/app.js" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Static files accessible${NC}"
        else
            echo -e "${RED}❌ Static files not accessible${NC}"
            return 1
        fi
        
        echo -e "${GREEN}✅ Browser tests passed${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ curl not found, skipping browser tests${NC}"
        return 0
    fi
}

# Function to cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${YELLOW}🧹 Stopping server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Clean up any leftover processes
    pkill -f "npm run dev web" 2>/dev/null || true
    pkill -f "tsx src/index.ts web" 2>/dev/null || true
}

# Function to generate test report
generate_report() {
    echo -e "${BLUE}📊 Test Report${NC}"
    echo -e "${BLUE}==============${NC}"
    
    local total_tests=$((basic_result + ai_result + browser_result))
    local passed_tests=0
    
    if [ $basic_result -eq 0 ]; then
        echo -e "${GREEN}✅ Basic API Tests: PASSED${NC}"
        ((passed_tests++))
    else
        echo -e "${RED}❌ Basic API Tests: FAILED${NC}"
    fi
    
    if [ $ai_result -eq 0 ]; then
        echo -e "${GREEN}✅ AI Auto Tests: PASSED${NC}"
        ((passed_tests++))
    else
        echo -e "${RED}❌ AI Auto Tests: FAILED${NC}"
    fi
    
    if [ $browser_result -eq 0 ]; then
        echo -e "${GREEN}✅ Browser Tests: PASSED${NC}"
        ((passed_tests++))
    else
        echo -e "${RED}❌ Browser Tests: FAILED${NC}"
    fi
    
    echo ""
    echo "Summary: $passed_tests/3 test suites passed"
    
    if [ $passed_tests -eq 3 ]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Check if server is already running
    if ! check_server; then
        start_server
    fi
    
    # Run test suites
    echo -e "\n${BLUE}🧪 Running Test Suites${NC}"
    echo -e "${BLUE}=====================${NC}"
    
    # Basic API tests
    set +e
    run_basic_tests
    basic_result=$?
    
    # AI auto tests
    run_ai_tests
    ai_result=$?
    
    # Browser tests
    run_browser_tests
    browser_result=$?
    set -e
    
    # Generate report
    echo ""
    generate_report
    return $?
}

# Run main function
main "$@"