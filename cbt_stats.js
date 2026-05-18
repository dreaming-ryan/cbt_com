/**
 * cbt_stats.js — cbt_com_quiz.html의 QUESTIONS 배열을 파싱하여
 * 회차·과목별 통계와 문제 원본 배열을 콜백으로 반환합니다.
 *
 * 컴퓨터활용능력 1급 필기 분류 체계:
 *   - round: "20-1", "20-2", "19-1", ... (연도-회차)
 *   - subject: 1, 2, 3 (1과목=컴퓨터 일반, 2과목=스프레드시트 일반, 3과목=데이터베이스 일반)
 */
(function () {
  'use strict';

  // 과목 번호 → 과목명 매핑 (컴활 1급 공식)
  var SUBJECT_NAMES = {
    1: '컴퓨터 일반',
    2: '스프레드시트 일반',
    3: '데이터베이스 일반'
  };

  // round 문자열("20-1") → 표시용 라벨("2020년 1회") 변환
  function formatRound(round) {
    if (!round) return '';
    var parts = String(round).split('-');
    if (parts.length !== 2) return String(round);
    var yy = parts[0], s = parts[1];
    var fullYear = (parseInt(yy, 10) < 50 ? 2000 : 1900) + parseInt(yy, 10);
    return fullYear + '년 ' + s + '회';
  }

  // round 정렬 키: "20-1" → 2020 * 10 + 1 = 20201
  function roundSortKey(round) {
    var parts = String(round).split('-');
    if (parts.length !== 2) return 0;
    var yy = parseInt(parts[0], 10);
    var s = parseInt(parts[1], 10);
    var fullYear = (yy < 50 ? 2000 : 1900) + yy;
    return fullYear * 10 + s;
  }

  function loadStats(callback) {
    fetch('cbt_com_quiz.html')
      .then(function (r) { return r.text(); })
      .then(function (html) {
        // cbt_com_quiz.html의 script 안에서 const QUESTIONS = [ ... ]; 배열을 찾는다.
        // 배열 종료는 "];" 형태로 나타나므로 그 지점을 안전하게 탐색한다.
        var startMatch = html.match(/const\s+QUESTIONS\s*=\s*\[/);
        if (!startMatch) {
          console.error('cbt_stats.js: QUESTIONS 배열 시작 탐색 실패');
          return;
        }
        var startIdx = startMatch.index + startMatch[0].length - 1; // '[' 위치
        // 균형 잡힌 대괄호 추적 (문자열 내부 escape 정확히 처리)
        var depth = 0;
        var endIdx = -1;
        var inStr = null;
        var escapeNext = false;
        var i;
        for (i = startIdx; i < html.length; i++) {
          var ch = html[i];
          if (inStr) {
            if (escapeNext) { escapeNext = false; continue; }
            if (ch === '\\') { escapeNext = true; continue; }
            if (ch === inStr) { inStr = null; }
            continue;
          }
          if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
          if (ch === '[') depth++;
          else if (ch === ']') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
          }
        }
        if (endIdx === -1) {
          console.error('cbt_stats.js: QUESTIONS 배열 끝 탐색 실패');
          return;
        }
        var arrLiteral = html.substring(startIdx, endIdx + 1);

        var questions;
        try {
          questions = (new Function('return ' + arrLiteral))();
        } catch (e) {
          console.error('cbt_stats.js: QUESTIONS 파싱 오류', e);
          return;
        }

        var totalQ = questions.length;
        var roundMap = {};
        var subjectMap = {};
        var roundSet = {};
        var subjectSet = {};

        questions.forEach(function (q) {
          roundSet[q.round] = true;
          subjectSet[q.subject] = true;
          roundMap[q.round] = (roundMap[q.round] || 0) + 1;
          subjectMap[q.subject] = (subjectMap[q.subject] || 0) + 1;
        });

        var rounds = Object.keys(roundSet).sort(function (a, b) {
          return roundSortKey(a) - roundSortKey(b);
        });
        var subjects = Object.keys(subjectSet).map(Number).sort(function (a, b) { return a - b; });
        var totalRounds = rounds.length;

        // 연도 목록 추출 (정렬: 오름차순 연도)
        var yearSet = {};
        rounds.forEach(function (r) {
          var yy = r.split('-')[0];
          var fullYear = (parseInt(yy, 10) < 50 ? 2000 : 1900) + parseInt(yy, 10);
          yearSet[fullYear] = true;
        });
        var years = Object.keys(yearSet).map(Number).sort(function (a, b) { return a - b; });

        callback({
          totalQ: totalQ,
          totalRounds: totalRounds,
          rounds: rounds,            // ["15-1", "15-2", ... "20-2"]
          roundLabels: rounds.map(formatRound), // ["2015년 1회", ...]
          subjects: subjects,        // [1, 2, 3]
          years: years,              // [2015, 2016, ...]
          roundMap: roundMap,
          subjectMap: subjectMap,
          subjectNames: SUBJECT_NAMES,
          questions: questions,
          formatRound: formatRound,
          roundSortKey: roundSortKey
        });
      })
      .catch(function (err) {
        console.error('cbt_stats.js fetch 오류:', err);
      });
  }

  window.CbtStats = {
    load: loadStats,
    SUBJECT_NAMES: SUBJECT_NAMES,
    formatRound: formatRound,
    roundSortKey: roundSortKey
  };
})();
