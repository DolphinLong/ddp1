#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Elective Tracker E2E Testing
 * Runs all test suites and generates comprehensive reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Elective Tracker E2E Test Suite...\n');

    try {
      // Run unit tests
      console.log('📋 Running Unit Tests...');
      this.results.unit = await this.runTestSuite('unit');

      // Run integration tests
      console.log('🔗 Running Integration Tests...');
      this.results.integration = await this.runTestSuite('integration');

      // Run E2E tests
      console.log('🎯 Running End-to-End Tests...');
      this.results.e2e = await this.runTestSuite('e2e');

      // Run performance tests
      console.log('⚡ Running Performance Tests...');
      this.results.performance = await this.runTestSuite('performance');

      // Generate comprehensive report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  runTestSuite(suiteName) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const jest = spawn('npx', ['jest', '--selectProjects', suiteName, '--verbose'], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      jest.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const result = {
          suite: suiteName,
          exitCode: code,
          duration,
          output,
          errorOutput,
          success: code === 0
        };

        if (code === 0) {
          console.log(`✅ ${suiteName} tests completed successfully (${duration}ms)\n`);
          resolve(result);
        } else {
          console.log(`❌ ${suiteName} tests failed with exit code ${code}\n`);
          resolve(result); // Don't reject, continue with other tests
        }
      });

      jest.on('error', (error) => {
        console.error(`❌ Failed to start ${suiteName} tests:`, error.message);
        reject(error);
      });
    });
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const allResults = Object.values(this.results);
    const successfulTests = allResults.filter(r => r && r.success).length;
    const totalTests = allResults.filter(r => r !== null).length;

    console.log('\n' + '='.repeat(80));
    console.log('📊 ELECTIVE TRACKER E2E TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Test Suites: ${successfulTests}/${totalTests} passed`);
    console.log('');

    // Individual suite results
    Object.entries(this.results).forEach(([suiteName, result]) => {
      if (result) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${suiteName.toUpperCase()}: ${result.duration}ms`);
        
        if (!result.success && result.errorOutput) {
          console.log(`   Error: ${result.errorOutput.split('\n')[0]}`);
        }
      } else {
        console.log(`⏭️  SKIP ${suiteName.toUpperCase()}: Not run`);
      }
    });

    console.log('');

    // Coverage summary
    this.generateCoverageSummary();

    // Performance metrics
    this.generatePerformanceMetrics();

    // Recommendations
    this.generateRecommendations();

    console.log('='.repeat(80));

    // Exit with appropriate code
    const overallSuccess = allResults.every(r => r === null || r.success);
    if (!overallSuccess) {
      console.log('❌ Some tests failed. Please review the output above.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    }
  }

  generateCoverageSummary() {
    console.log('📈 COVERAGE SUMMARY');
    console.log('-'.repeat(40));
    
    try {
      const coveragePath = path.join(__dirname, 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        
        Object.entries(coverage.total).forEach(([metric, data]) => {
          const percentage = data.pct;
          const status = percentage >= 80 ? '✅' : percentage >= 60 ? '⚠️' : '❌';
          console.log(`${status} ${metric}: ${percentage}%`);
        });
      } else {
        console.log('⚠️  Coverage report not found');
      }
    } catch (error) {
      console.log('⚠️  Could not read coverage report:', error.message);
    }
    
    console.log('');
  }

  generatePerformanceMetrics() {
    console.log('⚡ PERFORMANCE METRICS');
    console.log('-'.repeat(40));
    
    const performanceResult = this.results.performance;
    if (performanceResult && performanceResult.success) {
      console.log('✅ All performance tests passed');
      console.log('✅ Database operations within acceptable limits');
      console.log('✅ Memory usage within acceptable limits');
      console.log('✅ Algorithm performance optimized');
    } else if (performanceResult) {
      console.log('❌ Performance tests failed');
      console.log('⚠️  Review performance bottlenecks');
    } else {
      console.log('⏭️  Performance tests not run');
    }
    
    console.log('');
  }

  generateRecommendations() {
    console.log('💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));
    
    const failedSuites = Object.entries(this.results)
      .filter(([_, result]) => result && !result.success)
      .map(([name, _]) => name);

    if (failedSuites.length === 0) {
      console.log('✅ All test suites passed - system is ready for production');
      console.log('✅ Consider running tests regularly in CI/CD pipeline');
      console.log('✅ Monitor performance metrics in production');
    } else {
      console.log('❌ Failed test suites need attention:');
      failedSuites.forEach(suite => {
        console.log(`   - Fix ${suite} test failures before deployment`);
      });
      
      console.log('');
      console.log('🔧 Suggested actions:');
      console.log('   1. Review failed test output above');
      console.log('   2. Fix identified issues');
      console.log('   3. Re-run tests to verify fixes');
      console.log('   4. Consider adding more test coverage for edge cases');
    }
    
    console.log('');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;