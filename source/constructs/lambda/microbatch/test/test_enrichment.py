# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import sys
import uuid
import pytest
from test.mock import download_maxminddb, default_environment_variables


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestAlb:
    def init_default_parameter(self):
        from utils.enrichment import Alb

        self.alb_log_record ='https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-west-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n'
        self.alb_parser = Alb(record=self.alb_log_record)

    def test_init(self):
        self.init_default_parameter()

        assert self.alb_parser.field_delimiter == ' '
        assert self.alb_parser.line_delimiter == '\n'
        assert self.alb_parser.record == self.alb_log_record.strip('\n')
        assert self.alb_parser.pattern == '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) "([^ ]*) (.*) (- |[^ ]*)" "([^"]*)" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^"]*)" ([-.0-9]*) ([^ ]*) "([^"]*)" "([^"]*)" "([^ ]*)" "([^s]+?)" "([^s]+)" "([^ ]*)" "([^ ]*)"'
        assert self.alb_parser.match is not None

    def test_is_record(self):
        from utils.enrichment import Alb

        self.init_default_parameter()

        assert self.alb_parser.is_record() is True

        alb_log_record = f'{self.alb_parser.record} -\n'
        alb_parser = Alb(record=alb_log_record)
        assert alb_parser.is_record() is True

        alb_log_record = f'{self.alb_parser.record[:-5]}\n'
        alb_parser = Alb(record=alb_log_record)
        assert alb_parser.is_record() is False

    def test_ip_address(self):
        from utils.enrichment import Alb

        self.init_default_parameter()

        assert self.alb_parser.ip_address == '185.249.140.9'

        alb_parser = Alb(record='')
        assert alb_parser.user_agent == ''

    def test_user_agent(self):
        from utils.enrichment import Alb

        self.init_default_parameter()

        assert self.alb_parser.user_agent == 'Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2'

        alb_parser = Alb(record='')
        assert alb_parser.user_agent == ''

    def test_enrich_record(self):
        self.init_default_parameter()

        alb_log_record = self.alb_log_record.strip('\n')
        assert self.alb_parser.enrich_record(enrich_data={}) == f"{alb_log_record} {{}}\n"
        assert self.alb_parser.enrich_record(enrich_data={'geo_iso_code':'US'}) == f'{alb_log_record} {{"geo_iso_code":"US"}}\n'
        assert self.alb_parser.enrich_record(enrich_data={'geo_iso_code': 'US', 'ua_category': 'PC'}) == f'{alb_log_record} {{"geo_iso_code":"US","ua_category":"PC"}}\n'


@pytest.mark.usefixtures('download_maxminddb')
class TestCloudFront:
    def init_default_parameter(self):
        from utils.enrichment import CloudFront

        self.cloudfront_log_record ='2023-07-04	01:29:04	HIO51-C1	65763	185.158.128.14	GET	test.cloudfront.net	/Book-10.png	200	https://www.mydomain.com/page/Book-3.png	Mozilla/5.0 (iPad; CPU iPad OS 12_4_8 like Mac OS X) AppleWebKit/532.2 (KHTML, like Gecko) FxiOS/13.9n5321.0 Mobile/11T585 Safari/532.2	-	-	Redirect	y3mnwnC9wPvLOXIEQ212yZ9HDvVM7seAQiWCB0d4cHhsbZAOnt3Mmcp1	test.cloudfront.net	https	1599	1.747954871498064	-	TLSv1.3	TLS_CHACHA20_POLY1305_SHA256	Hit	HTTP/2.0	-	 -	15489	0.9539746454205995	Miss	image/png	618754.3893625687	-	-\n'
        self.cloudfront_parser = CloudFront(record=self.cloudfront_log_record)

    def test_init(self):
        self.init_default_parameter()

        assert self.cloudfront_parser.field_delimiter == '\t'
        assert self.cloudfront_parser.line_delimiter == '\n'
        assert self.cloudfront_parser.record == self.cloudfront_log_record.strip('\n')

    def test_is_record(self):
        from utils.enrichment import CloudFront

        self.init_default_parameter()

        assert self.cloudfront_parser.is_record() is True

        cloudfront_parser = CloudFront(record='#Version: 1.0')
        assert cloudfront_parser.is_record() is False

        cloudfront_parser = CloudFront(record='#Fields: date time x-edge-location sc-bytes c-ip cs-method cs(Host) cs-uri-stem sc-status cs(Referer) cs(User-Agent) cs-uri-query cs(Cookie) x-edge-result-type x-edge-request-id x-host-header cs-protocol cs-bytes time-taken x-forwarded-for ssl-protocol ssl-cipher x-edge-response-result-type cs-protocol-version fle-status fle-encrypted-fields c-port time-to-first-byte x-edge-detailed-result-type sc-content-type sc-content-len sc-range-start sc-range-end')
        assert cloudfront_parser.is_record() is False

        cloudfront_log_record = f'{self.cloudfront_parser.record}\t-\n'
        cloudfront_parser = CloudFront(record=cloudfront_log_record)
        assert cloudfront_parser.is_record() is False

    def test_ip_address(self):
        from utils.enrichment import CloudFront

        self.init_default_parameter()

        assert self.cloudfront_parser.ip_address == '185.158.128.14'

        cloudfront_parser = CloudFront(record='')
        assert cloudfront_parser.ip_address == ''

    def test_user_agent(self):
        from utils.enrichment import CloudFront

        self.init_default_parameter()

        assert self.cloudfront_parser.user_agent == 'Mozilla/5.0 (iPad; CPU iPad OS 12_4_8 like Mac OS X) AppleWebKit/532.2 (KHTML, like Gecko) FxiOS/13.9n5321.0 Mobile/11T585 Safari/532.2'

        cloudfront_parser = CloudFront(record='')
        assert cloudfront_parser.user_agent == ''

    def test_enrich_record(self):
        self.init_default_parameter()

        cloudfront_log_record = self.cloudfront_log_record.strip('\n')
        assert self.cloudfront_parser.enrich_record(enrich_data={}) == f"{cloudfront_log_record}\t{{}}\n"
        assert self.cloudfront_parser.enrich_record(enrich_data={'geo_iso_code':'US'}) == f'{cloudfront_log_record}\t{{"geo_iso_code":"US"}}\n'
        assert self.cloudfront_parser.enrich_record(enrich_data={'geo_iso_code': 'US', 'ua_category': 'PC'}) == f'{cloudfront_log_record}\t{{"geo_iso_code":"US","ua_category":"PC"}}\n'


@pytest.mark.usefixtures('download_maxminddb')
class TestEnrichProcessor:

    def init_default_parameter(self):
        from utils.enrichment import EnrichProcessor

        os.environ['ENV'] = 'LOCAL'

        self.source_type = 'alb'
        self.enrich_processor = EnrichProcessor(source_type=self.source_type)

    def test_init(self):
        from utils.enrichment import EnrichProcessor, Alb, CloudFront

        self.init_default_parameter()

        assert self.enrich_processor.source_type == self.source_type
        assert self.enrich_processor.source_parser_cls is Alb

        enrich_processor = EnrichProcessor(source_type='cloudfront')

        assert enrich_processor.source_type == 'cloudfront'
        assert enrich_processor.source_parser_cls is CloudFront

        with pytest.raises(Exception) as exception_info:
            EnrichProcessor(source_type='do-not-supported')
        assert exception_info.value.args[0] == f"Do not supported source type: do-not-supported. Supported source type: ['cloudfront', 'alb']."

    def test_get_maxminddb_path(self):
        self.init_default_parameter()
        
        os.environ.pop('ENV', None)
        assert self.enrich_processor.get_maxminddb_path() == '/opt/python/maxminddb/GeoLite2-City.mmdb'

        os.environ['ENV'] = 'LAMBDA'
        assert self.enrich_processor.get_maxminddb_path() == '/opt/python/maxminddb/GeoLite2-City.mmdb'

        os.environ['ENV'] = 'LOCAL'
        assert self.enrich_processor.get_maxminddb_path() == f'{os.path.dirname(os.path.dirname(os.path.abspath(__file__)))}/utils/enrichment/maxminddb/GeoLite2-City.mmdb'

    def test_maxminddb_reader(self):
        self.init_default_parameter()

        os.environ['ENV'] = 'LOCAL'

        assert self.enrich_processor.maxminddb_reader.get('127.0.0.1') is None

    def test_geo_ip(self):
        from utils.enrichment import Alb
        self.init_default_parameter()

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq not-a-ip-address:8000 not-a-ip-address:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.pngHTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.geo_ip(cls=alb_parser)
        assert enriched_data == {}

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 127.0.0.1:8000 127.0.0.1:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.geo_ip(cls=alb_parser)
        assert enriched_data == {}

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 96.127.0.4:8000 96.127.0.4:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.geo_ip(cls=alb_parser)
        assert enriched_data.get('geo_city') not in ['', None]
        assert enriched_data.get('geo_country') not in ['', None]
        assert enriched_data.get('geo_iso_code') not in ['', None]
        assert enriched_data.get('geo_location') not in ['', None]

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 2c0f:fed8:ffff:ffff:ffff:ffff:ffff:ffff:8000 2c0f:fed8:ffff:ffff:ffff:ffff:ffff:ffff:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.geo_ip(cls=alb_parser)
        assert enriched_data.get('geo_country') not in ['', None]
        assert enriched_data.get('geo_iso_code') not in ['', None]
        assert enriched_data.get('geo_location') not in ['', None]

    def test_user_agent(self):
        from utils.enrichment import Alb
        self.init_default_parameter()

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 127.0.0.1:8000 127.0.0.1:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward""-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.user_agent(cls=alb_parser)
        assert enriched_data == {
            'ua_browser': 'Other',
            'ua_browser_version': '',
            'ua_os': 'Other',
            'ua_os_version': '',
            'ua_device': 'Other',
            'ua_category': 'Other'
            }

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 127.0.0.1:8000 127.0.0.1:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (iPad; CPU iPad OS 12_4_8 like Mac OS X) AppleWebKit/532.2 (KHTML, like Gecko) FxiOS/13.9n5321.0 Mobile/11T585 Safari/532.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.user_agent(cls=alb_parser)
        assert enriched_data == {
            'ua_browser': 'Firefox iOS',
            'ua_browser_version': '13.9',
            'ua_os': 'iOS',
            'ua_os_version': '12.4.8',
            'ua_device': 'iPad',
            'ua_category': 'Tablet'
            }

        alb_record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 127.0.0.1:8000 127.0.0.1:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (compatible; spider/2.0)" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        alb_parser = Alb(record=alb_record)
        enriched_data = self.enrich_processor.user_agent(cls=alb_parser)
        assert enriched_data == {
            'ua_browser': 'spider',
            'ua_browser_version': '2.0',
            'ua_os': 'Other',
            'ua_os_version': '',
            'ua_device': 'Spider',
            'ua_category': 'Bot'
            }

    def test_process(self):
        from utils.enrichment import EnrichProcessor

        self.init_default_parameter()

        tmp_path = f'/tmp/{str(uuid.uuid4())}'
        os.makedirs(tmp_path, exist_ok=True)

        enrich_processor = EnrichProcessor(source_type='alb')
        record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n'
        assert enrich_processor.process(record=record, enrich_plugins=set()) == record

        enrich_processor = EnrichProcessor(source_type='alb')
        record = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n'
        record_enriched = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        assert enrich_processor.process(record=record, enrich_plugins=set(['geo_ip', 'user_agent'])) == record_enriched

        enrich_data = 'https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_location":"48.8582,2.3387","ua_browser":"Mobile Safari","ua_browser_version":"3.0.5","ua_os":"iOS","ua_os_version":"3.0","ua_device":"iPod","ua_category":"Mobile"}\n'
        assert enrich_processor.process(record='https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-"\n', enrich_plugins=set(['geo_ip', 'user_agent'])) == enrich_data

        enrich_processor = EnrichProcessor(source_type='alb')
        enrich_data = 'https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_city":"Paris","geo_location":"48.8323,2.4075","ua_browser":"Chrome","ua_browser_version":"35.0.847","ua_os":"Mac OS X","ua_os_version":"10.9.4","ua_device":"Mac","ua_category":"PC"}\n'
        assert enrich_processor.process(record='https 2023-07-04T13:28:28.138531Z app/ALB/nwpiqzrqc67zsbwq 185.249.140.9:1231 10.2.2.174:443 1.5414835421835185 1.8228018060637856 1.1708408317685808 200 200 1525 59997 "GET http://alb.us-east-1.elb.amazonaws.com/Book-10.png HTTP/1.1" "Mozilla/5.0 (Macintosh; PPC Mac OS X 10_9_4) AppleWebKit/536.2 (KHTML, like Gecko) Chrome/35.0.847.0 Safari/536.2" TLS_AES_128_GCM_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/e240e6889123qdqw "Root=1-5034982-7f2d2ae7a15148ff825e84b9f59a0c68" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:28.138531Z "forward" "-" "-" "10.2.2.176:443" "200" "-" "-"\n', enrich_plugins=set(['geo_ip', 'user_agent'])) == enrich_data

        enrich_data = 'https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-" {"geo_iso_code":"FR","geo_country":"France","geo_location":"48.8582,2.3387","ua_browser":"Mobile Safari","ua_browser_version":"3.0.5","ua_os":"iOS","ua_os_version":"3.0","ua_device":"iPod","ua_category":"Mobile"}\n'
        assert enrich_processor.process(record='https 2023-07-04T13:28:26.138531Z app/ALB/6cv0xw490oh8nq7n 185.176.232.11:15364 10.2.2.175:443 1.9537748743523755 1.9607717664807693 1.3631916131229302 200 200 1521 50675 "GET https://alb.us-east-1.elb.amazonaws.com/Javascript-Master.png HTTP/2.0" "Mozilla/5.0 (iPod; U; CPU iPhone OS 3_0 like Mac OS X; yi-US) AppleWebKit/531.9.3 (KHTML, like Gecko) Version/3.0.5 Mobile/8B117 Safari/6531.9.3" TLS_CHACHA20_POLY1305_SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/gateway/06409f87b3bad113 "Root=1-8187477-b5b5cdfa33534d589247a5c61de9fe0e" "alb.us-east-1.elb.amazonaws.com" "session-reused" 0 2023-07-04T13:28:26.138531Z "forward" "-" "-" "10.2.2.174:80" "200" "-" "-"\n', enrich_plugins=set(['geo_ip', 'user_agent'])) == enrich_data
